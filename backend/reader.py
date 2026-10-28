"""Read existing bot snapshot, research summaries and final exit logs only."""
import datetime as dt
import hashlib
import json
import math
from pathlib import Path
import time
from .review_schedule import schedule

KST=dt.timezone(dt.timedelta(hours=9))


def number(value):
    try:
        value=float(value)
        return value if math.isfinite(value) else None
    except (TypeError,ValueError): return None


def stamp(value):
    value=dt.datetime.fromisoformat(str(value))
    if value.tzinfo is None:value=value.replace(tzinfo=KST)
    return value.isoformat()


def reverse_lines(path):
    with path.open('rb') as handle:
        handle.seek(0,2); cursor=handle.tell(); carry=b''; read=0
        while cursor and read<16*1024*1024:
            size=min(65536,cursor);cursor-=size;read+=size;handle.seek(cursor)
            parts=(handle.read(size)+carry).split(b'\n');carry=parts[0]
            for line in reversed(parts[1:]):
                if line:yield line
        if not cursor and carry:yield carry


class Reader:
    def __init__(self,root):
        self.root=Path(root);self.trades_at=0;self.trades=[]

    def history(self):
        if self.trades_at and time.monotonic()-self.trades_at<60:return self.trades
        records=[];seen=set()
        for path in sorted((self.root/'research_logs').glob('????-??.jsonl'),reverse=True)[:6]:
            for line in reverse_lines(path):
                if b'"position_exit"' not in line and b'"position_entry"' not in line:continue
                try:
                    record=json.loads(line);event=record.get('event');ticker=str(record.get('ticker') or '')
                    if event not in ('position_exit','position_entry') or not ticker.startswith('KRW-'):continue
                    sell=event=='position_exit';order=record.get('order') or {};realized=record.get('realized') or {}
                    uuid=str(realized.get('order_uuid') or order.get('uuid') or '')
                    if not uuid or (event,uuid) in seen:continue
                    seen.add((event,uuid));position=record.get('position') or {}
                    confirmed=bool(realized.get('order_uuid') or order.get('execution_confirmed'))
                    rate=number(realized.get('net_realized_pnl')) if sell else None
                    records.append(dict(id=hashlib.sha256((event+uuid).encode()).hexdigest()[:16],
                        ts=stamp(record['ts']),ticker=ticker,side='SELL' if sell else 'BUY',
                        reason=str(record.get('reason') or ('BUY' if not sell else 'EXIT')),
                        qty=number(order.get('executed_volume') or position.get('balance')),
                        price=number(realized.get('avg_fill_price') or order.get('avg_fill_price') or position.get('avg_price')),
                        pnl_krw=number(realized.get('net_pnl_krw')) if sell and confirmed else None,
                        return_pct=rate*100 if rate is not None and confirmed else None,
                        fee_krw=number(realized.get('sell_fee') if sell else order.get('paid_fee')),
                        basis='NET_CONFIRMED' if sell and confirmed else 'FILL_CONFIRMED' if confirmed else 'UNCONFIRMED'))
                    if len(records)>=150:break
                except (ValueError,TypeError,KeyError):continue
            if len(records)>=150:break
        records.sort(key=lambda row:row['ts'],reverse=True)
        self.trades_at=time.monotonic();self.trades=records
        return records

    def research(self,filename,frozen=False):
        try:
            raw=json.loads((self.root/filename).read_text(encoding='utf-8'))
            rows=[]
            for item in raw.get('controls',[]):
                config=item.get('config') or {}
                fields=('marked_return_pct','stress_return_pct','max_drawdown_pct',
                        'profit_factor','trades','wins','win_rate_pct','marked_equity','initial_equity')
                rows.append({**{k:number(item.get(k)) for k in fields},
                    'id':str(item.get('policy_id') or ''),'name':str(item.get('name') or ''),
                    'is_baseline':bool(item.get('is_baseline')),
                    'open_ticker':item.get('open_ticker'),
                    'ma20_cap':number(config.get('max_price_ma20_distance'))})
            return dict(available=True,frozen=frozen,started_at=stamp(raw['research_started_at']),
                        version=raw.get('research_version'),manifest_hash=raw.get('policy_manifest_hash'),
                        updated_at=stamp(raw['updated_at']),rows=rows,error_count=raw.get('error_count'),
                        source_scan_id=raw.get('source_last_scan_id'))
        except (OSError,ValueError,TypeError,KeyError):
            return dict(available=False,frozen=frozen,rows=[])

    def snapshot(self,active):
        raw=json.loads((self.root/'web_dashboard_snapshot.json').read_text(encoding='utf-8'))
        if raw.get('schema_version')!=1:raise ValueError('unsupported snapshot')
        observed=stamp(raw['observed_at']);dt.datetime.fromisoformat(observed)
        if not isinstance(raw.get('account'),dict) or not isinstance(raw.get('positions'),list):raise ValueError('invalid snapshot')
        exit_research=self.research('strategy9_research_summary.json')
        try:
            health=json.loads((self.root/'runtime_health.json').read_text(encoding='utf-8'))
            health={key:health.get(key) for key in ('version','observed_at','last_loop_at',
                'last_completed_loop_at','loop_gap_sec','fast_monitor','buy_blocked','last_success','failures')}
        except (OSError,ValueError,TypeError,AttributeError):
            health=None
        return dict(schema_version=1,generated_at=dt.datetime.now(KST).isoformat(),
                    observed_at=observed,source=dict(service_active=bool(active),
                    observation_seconds=60,loop_seconds=30,view_seconds=5),
                    account=raw['account'],periods=raw.get('periods') or {},
                    positions=raw['positions'],policy=raw.get('policy') or {},
                    warnings=raw.get('warnings') or [],scan=raw.get('scan') or {},
                    runtime=health,exit_research=exit_research,
                    review=schedule(self.root,exit_research),
                    trades=self.history(),research=self.research('strategy8_research_summary.json'),
                    previous_research=self.research('strategy7_research_summary.json',True))
