"""Read-only operations checks; never logs credentials or account amounts."""
import ast
import datetime as dt
import json
from pathlib import Path
import subprocess
import sys
import urllib.error
import urllib.request


def main():
    sys.path.insert(0,'/opt/upbit-dashboard')
    from backend.reader import Reader
    from backend.server import Store
    root=Path('/opt/bots/upbit')
    values={}
    tree=ast.parse((root/'main.py').read_text(encoding='utf-8'))
    for node in tree.body:
        if isinstance(node,ast.Assign):
            for target in node.targets:
                if isinstance(target,ast.Name) and target.id in {'USE_SHEET_LOG','MAX_ALLOCATION','TRAIL_ARM','TRAIL_GAP','MAX_PRICE_MA20_DISTANCE'}:
                    values[target.id]=ast.literal_eval(node.value)
    assert values=={'USE_SHEET_LOG':False,'MAX_ALLOCATION':.995,'TRAIL_ARM':.04,'TRAIL_GAP':.015,'MAX_PRICE_MA20_DISTANCE':.20}
    services={name:subprocess.run(['systemctl','is-active',name],capture_output=True,text=True).stdout.strip()
              for name in ('upbitbot','upbit-market-scan','upbit-strategy8-research','upbit-dashboard','kiwoom-dashboard','stock-journal','caddy')}
    assert all(v=='active' for v in services.values()), services
    data=Reader(root).snapshot(True)
    observed=dt.datetime.fromisoformat(data['observed_at'])
    age=(dt.datetime.now(dt.timezone.utc)-observed).total_seconds()
    assert 0<=age<180, age
    checks={}
    for route,origin,expected in (('health',None,200),('snapshot',None,401),('snapshot','https://invalid.example',403)):
        request=urllib.request.Request('https://stock-journal.52-79-211-161.sslip.io/upbit-api/'+route,
                    headers={'Origin':origin} if origin else {})
        try:response=urllib.request.urlopen(request,timeout=10)
        except urllib.error.HTTPError as error:response=error
        with response:
            checks[route+':'+str(origin)]=response.status
            assert response.status==expected
    result={'verified_at_kst':dt.datetime.now().isoformat(),'services':services,'settings':values,
            'source_age_seconds':round(age,1),'positions':len(data['positions']),
            'recent_trade_records':len(data['trades']),'research_rows':len(data['research']['rows']),
            'research_started_at':data['research'].get('started_at'),
            'old_research_preserved':data['previous_research']['available'],
            'password_initialized':Store('/var/lib/upbit-dashboard/auth.db').initialized(),
            'new_buys_paused':data['policy'].get('buy_paused'), 'https_checks':checks}
    target=Path(__file__).resolve().parent.parent/'verification-result.json'
    target.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2))


if __name__=='__main__':main()
