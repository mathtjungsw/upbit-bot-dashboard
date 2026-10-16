"""Atomic display snapshot from already computed bot metrics. No network I/O."""
import datetime as dt
import json
import math
import os
from pathlib import Path
import tempfile

DEFAULT_PATH = '/opt/bots/upbit/web_dashboard_snapshot.json'


def number(value):
    try:
        value = float(value)
        return value if math.isfinite(value) else None
    except (TypeError, ValueError):
        return None


def iso(value):
    if isinstance(value, str):
        value = dt.datetime.fromisoformat(value)
    if value.tzinfo is None:
        value = value.replace(tzinfo=dt.timezone(dt.timedelta(hours=9)))
    return value.isoformat()


def export_dashboard_snapshot(now, state, performance, periods, cash, equity,
                              current_price, exit_view, warning='', policy=None,
                              path=DEFAULT_PATH):
    performance = performance or {}
    tracker = (state.get('actual_performance') or {}).get('cashflow_tracker') or {}
    warnings = [str(v) for v in (warning, performance.get('tracking_warning')) if v]
    if tracker.get('withdrawal_history_reconciliation_pending'):
        warnings.append('출금 내역 대사 필요')
    if (tracker.get('stable_balance_observer') or {}).get('pending_series'):
        warnings.append('현금변동 확인 중')
    observation_status = str(tracker.get('return_observation_status') or '')
    if observation_status.startswith(('blocked:', 'pending:')):
        warnings.append('입출금·체결 대사 중 · 기간 수익률은 마지막 확인 자료')
    account_fields = ('started_at','initial_equity_krw','realized_pnl_krw',
                      'unrealized_pnl_krw','total_pnl_krw','return_pct',
                      'net_contributions_krw','cumulative_deposits_krw',
                      'cumulative_withdrawals_krw','adjusted_total_pnl_krw',
                      'legacy_external_adjustment_krw','external_change_krw',
                      'unclassified_inflows_krw','unclassified_outflows_krw','closed_trades')
    account = {key: (iso(performance[key]) if key=='started_at' and performance.get(key)
                     else number(performance.get(key))) for key in account_fields}
    account.update(cash_krw=number(cash),equity_krw=number(equity),
                   position_value_krw=number(equity-cash),
                   basis='estimated_liquidation_equity_minus_net_contributions',
                   observation_status=observation_status)
    positions=[]
    for ticker, position in (state.get('positions') or {}).items():
        avg=number(position.get('avg_price'))
        price=number(current_price)
        view=exit_view or {}
        fields=('balance','avg_price','stop_price','stop_loss_pct','max_pnl','min_pnl',
                'trail_arm','trail_gap','trail_peak_pnl','buy_fee')
        item={key:number(position.get(key)) for key in fields}
        item.update(ticker=ticker,entry_at=iso(position['entry_ts']),
                    observed_at=iso(now),price=price,
                    price_source='last_saved_price' if warning=='현재가 재조회 필요' else 'bot_account_observation',
                    strategy_name=str(position.get('strategy_name') or ''),
                    exit_mode=str(position.get('exit_mode') or ''),
                    trail_armed=bool(position.get('trail_armed')),
                    return_pct=(price/avg-1)*100 if price is not None and avg else None,
                    exit_view={key:view.get(key) for key in ('price','raw_trigger_price',
                        'state_label','fill_pct','executed_volume','remaining_volume',
                        'partial_avg_price','is_trailing','armed','peak_pnl')})
        positions.append(item)
    payload=dict(schema_version=1,observed_at=iso(now),account=account,positions=positions,
                 periods={key:{field:number((periods.get(key) or {}).get(field))
                               for field in ('return_pct','mdd_pct','samples')}
                          for key in ('day','week','month','cumulative')},
                 policy=policy or {},warnings=list(dict.fromkeys(warnings)),
                 scan=dict(id=state.get('last_scan_id'),
                           observed_at=iso(state['last_scan_at']) if state.get('last_scan_at') else None,
                           candidates=state.get('last_scan_candidate_count'),
                           error=str(state.get('last_scan_error') or ''),
                           waiting_reason=str(state.get('no_position_reason') or ''),
                           action=str(state.get('last_action') or '')))
    destination=Path(path)
    descriptor, temporary=tempfile.mkstemp(prefix='.web-snapshot-',dir=destination.parent)
    try:
        with os.fdopen(descriptor,'w',encoding='utf-8') as handle:
            json.dump(payload,handle,ensure_ascii=False,allow_nan=False,separators=(',',':'))
            handle.flush()
        os.chmod(temporary,0o600)
        os.replace(temporary,destination)
    finally:
        if os.path.exists(temporary): os.unlink(temporary)
    return payload
