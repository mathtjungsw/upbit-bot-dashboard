"""Back up and install reviewed web display changes, preserving order state."""
import argparse
import ast
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
import urllib.error
import urllib.request

EXPECTED='2e3c309eb8532196a81e179894c4bd7c3c18770b1dcf365d9a49170ed52d3f24'
ROOT=Path('/opt/bots/upbit')
TARGET=Path('/opt/upbit-dashboard')


def run(*args):
    return subprocess.run(args,check=True,timeout=60,capture_output=True,text=True).stdout


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def assert_scoped_change(before,after):
    def stable(source):
        tree=ast.parse(source)
        tree.body=[node for node in tree.body if not (
            isinstance(node,ast.FunctionDef) and node.name in {'main','is_trading_paused','update_account_status'})
            and not (isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='USE_SHEET_LOG' for t in node.targets))]
        return ast.dump(tree,include_attributes=False)
    if stable(before)!=stable(after):raise RuntimeError('Unexpected bot strategy/accounting change')
    tree=ast.parse(after)
    setting=next(n.value.value for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='USE_SHEET_LOG' for t in n.targets))
    if setting is not False:raise RuntimeError('Sheets must be disconnected')
    compile(after,'main.py','exec')


def read_old_pause():
    # One final read transfers the previous pause setting before disconnection.
    import gspread
    gc=gspread.service_account(filename=str(ROOT/'credentials.json'))
    gc.set_timeout(10)
    sheet=gc.open_by_key('1l3tNIWDJrHvdGSC5dNoOO1_3QvIn8xQ2XiULw1oBqwg').worksheet('대시보드')
    value=str(sheet.acell('B2').value or '').strip()
    if value not in ('0','1'):raise RuntimeError('Old B2 pause status is ambiguous; refusing automatic resume')
    return value=='1'


def replace_file(source,destination):
    tmp=destination.with_name(destination.name+'.web-next')
    shutil.copyfile(source,tmp);tmp.chmod(0o644)
    shutil.chown(tmp,user='ubuntu',group='ubuntu');os.replace(tmp,destination)


def main():
    p=argparse.ArgumentParser();p.add_argument('stage');args=p.parse_args()
    if os.geteuid()!=0:raise SystemExit('Run with sudo')
    stage=Path(args.stage).resolve();bot=ROOT/'main.py';proxy=Path('/etc/caddy/Caddyfile')
    if sha(bot)!=EXPECTED:raise RuntimeError('Live source changed; inspect and review again')
    assert_scoped_change(bot.read_text(encoding='utf-8'),(stage/'bot-main.py').read_text(encoding='utf-8'))
    run('systemctl','is-active','upbitbot','upbit-market-scan','upbit-strategy8-research','caddy')
    if TARGET.exists():raise RuntimeError('Existing Upbit dashboard deployment needs review')
    paused=read_old_pause()
    backup=ROOT/'backups'/('web-dashboard-'+dt.datetime.now().strftime('%Y%m%d_%H%M%S'))
    backup.mkdir(mode=0o700)
    shutil.copy2(bot,backup/'main.py');shutil.copy2(proxy,backup/'Caddyfile')
    control=ROOT/'web_buy_pause.json'
    if control.exists():raise RuntimeError('Existing local pause file needs review')
    control.write_text(json.dumps({'paused':paused,'source':'sheets-cutover','at':dt.datetime.now().isoformat()}))
    control.chmod(0o600);shutil.chown(control,user='ubuntu',group='ubuntu')
    data=Path('/var/lib/upbit-dashboard');data.mkdir(mode=0o700,exist_ok=True);shutil.chown(data,user='ubuntu',group='ubuntu')
    TARGET.mkdir()
    for name in ('backend','docs'):
        shutil.copytree(stage/name,TARGET/name,ignore=shutil.ignore_patterns('__pycache__'))
    for name in ('web_dashboard_export.py','buy_pause.py'):
        replace_file(stage/name,ROOT/name)
    unit=Path('/etc/systemd/system/upbit-dashboard.service')
    if unit.exists():raise RuntimeError('Existing API service needs review')
    shutil.copy2(stage/'deploy/upbit-dashboard.service',unit)
    old=proxy.read_text();anchor='    handle /bot-api/* {'
    if old.count(anchor)!=1 or '/upbit-api/' in old:raise RuntimeError('Proxy config changed; inspect first')
    new=old.replace(anchor,'    handle /upbit-api/* {\n        reverse_proxy 127.0.0.1:8881\n    }\n'+anchor,1)
    bot_changed=False
    try:
        run('systemctl','daemon-reload');run('systemctl','enable','--now','upbit-dashboard')
        time.sleep(2)
        with urllib.request.urlopen('http://127.0.0.1:8881/upbit-api/health',timeout=5) as response:assert json.load(response)['ok']
        try:
            urllib.request.urlopen('http://127.0.0.1:8881/upbit-api/snapshot',timeout=5)
            raise RuntimeError('Anonymous financial access is unexpectedly enabled')
        except urllib.error.HTTPError as error:assert error.code==401
        proxy.write_text(new);run('caddy','validate','--config',str(proxy));run('systemctl','reload','caddy')
        run('systemctl','stop','upbitbot')
        if sha(bot)!=EXPECTED:raise RuntimeError('Bot changed during cutover')
        shutil.copy2(ROOT/'state.json',backup/'state.json');state_hash=sha(ROOT/'state.json')
        replace_file(stage/'bot-main.py',bot);bot_changed=True
        run('/opt/bots/upbit/.venv/bin/python','-m','py_compile',str(bot))
        if sha(ROOT/'state.json')!=state_hash:raise RuntimeError('Account state changed during install')
        run('systemctl','start','upbitbot');time.sleep(3)
        run('systemctl','is-active','upbitbot','upbit-market-scan','upbit-strategy8-research','upbit-dashboard','caddy')
        result={'installed_at_kst':dt.datetime.now().isoformat(),'backup':str(backup),
                'bot_sha256':sha(bot),'previous_sha256':EXPECTED,'account_state_preserved':True,
                'sheets_disconnected':True,'new_buys_paused':paused,
                'website':'https://mathtjungsw.github.io/upbit-bot-dashboard/',
                'password_initialized':False}
        (stage/'deployment-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        (backup/'deployment-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(result,ensure_ascii=False,indent=2))
    except Exception:
        if bot_changed:replace_file(backup/'main.py',bot)
        run('systemctl','start','upbitbot')
        shutil.copy2(backup/'Caddyfile',proxy);run('systemctl','reload','caddy')
        print('ROLLED BACK BOT/PROXY; inspect backup '+str(backup),flush=True)
        raise


if __name__=='__main__':main()
