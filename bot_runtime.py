"""Host-scoped transport bounds and small, credential-free operational snapshot.

No retry is performed here, especially for writes with an ambiguous response.
Install only in the live process entry point, before creating an exchange client.
"""
import datetime as dt
import json
import math
import os
from pathlib import Path
import tempfile
import time
from urllib.parse import urlsplit

KST = dt.timezone(dt.timedelta(hours=9))
DEFAULT_PATH = '/opt/bots/upbit/runtime_health.json'
VERSION = 'ops-r1-20261029'


def now():
    return dt.datetime.now(KST).isoformat()


def validate_balances(value):
    if not isinstance(value, list) or not value:
        raise ValueError('account response is not a nonempty list')
    seen = set()
    for item in value:
        if not isinstance(item, dict) or not item.get('currency'):
            raise ValueError('invalid account row')
        if item['currency'] in seen:
            raise ValueError('duplicate account currency')
        seen.add(item['currency'])
        for key in ('balance', 'locked', 'avg_buy_price'):
            try:
                number = float(item[key])
            except (KeyError, TypeError, ValueError):
                raise ValueError('invalid account amount') from None
            if not math.isfinite(number) or number < 0:
                raise ValueError('invalid account amount')
    return value


class Runtime:
    def __init__(self, path=DEFAULT_PATH, clock=time.monotonic):
        self.path = Path(path)
        self.clock = clock
        self.enabled = False
        self.last_flush = float('-inf')
        self.last_loop = None
        self.account_clock = None
        self.event = None
        self.data = dict(schema_version=1, version=VERSION, started_at=now(),
                         failures={}, last_success={}, last_loop_at=None,
                         loop_gap_sec=None, fast_monitor=False, last_error=None)

    def flush(self, force=False):
        if not self.enabled or (not force and self.clock()-self.last_flush < 5):
            return
        payload = {**self.data, 'observed_at': now(), 'buy_blocked': not self.can_buy()}
        temp = None
        try:
            fd, temp = tempfile.mkstemp(prefix='.runtime-', dir=self.path.parent)
            with os.fdopen(fd, 'w', encoding='utf-8') as stream:
                json.dump(payload, stream, ensure_ascii=False, allow_nan=False)
            os.chmod(temp, 0o600)
            os.replace(temp, self.path)
            self.last_flush = self.clock()
        except OSError:
            # Monitoring failure must not abort protection of an existing position.
            pass
        finally:
            if temp and os.path.exists(temp):
                os.unlink(temp)

    def note(self, kind, **fields):
        if self.event:
            try:
                self.event(kind, **fields)
            except Exception:
                pass

    def record(self, group, success, elapsed=0, error=None):
        previous = self.data['failures'].get(group)
        if success:
            self.data['last_success'][group] = now()
            self.data['failures'].pop(group, None)
            if group == 'accounts':
                self.account_clock = self.clock()
            if previous:
                self.note('api_recovered', group=group, failures=previous['count'])
        else:
            self.data['failures'][group] = dict(at=now(), count=(previous or {}).get('count', 0)+1,
                                               error=str(error), elapsed_sec=round(elapsed,3))
            self.data['last_error'] = dict(at=now(), group=group, error=str(error))
            if not previous:
                self.note('api_failure', group=group, error=str(error))
        self.data['last_request_seconds'] = round(elapsed,3)
        self.flush(force=not success or bool(previous))

    def can_buy(self):
        if not self.enabled:  # Offline test harness: no transport was installed.
            return True
        if self.account_clock is None or self.clock()-self.account_clock > 60:
            return False
        return not any(x in self.data['failures'] for x in ('accounts','ticker','orderbook'))

    def loop_started(self):
        clock = self.clock()
        gap = None if self.last_loop is None else clock-self.last_loop
        self.last_loop = clock
        self.data.update(last_loop_at=now(), loop_gap_sec=round(gap,3) if gap is not None else None)
        if gap is not None and gap > 90:
            self.note('loop_delay', seconds=round(gap,3))
        self.flush()

    def loop_finished(self, fast):
        self.data.update(fast_monitor=bool(fast), last_completed_loop_at=now())
        self.flush()

    def install(self, requests_module, event=None):
        session = requests_module.sessions.Session
        original = session.request
        if getattr(original, '_upbit_bounded', False):
            raise RuntimeError('Upbit transport already installed')
        self.enabled = True
        self.event = event
        runtime = self

        def bounded(instance, method, url, **kwargs):
            parsed = urlsplit(url)
            if parsed.hostname != 'api.upbit.com':
                return original(instance, method, url, **kwargs)
            # Replace SDK None/unbounded values, but preserve tighter explicit limits.
            value = kwargs.get('timeout')
            limits = value if isinstance(value, tuple) and len(value)==2 else (value,value)
            kwargs['timeout'] = tuple(min(float(v), cap) if isinstance(v,(int,float))
                                      and math.isfinite(v) and v>0 else cap
                                      for v,cap in zip(limits,(3.,5.)))
            path = parsed.path
            group = 'accounts' if path == '/v1/accounts' else 'ticker' if path == '/v1/ticker' else 'orderbook' if path == '/v1/orderbook' else 'order' if path.startswith('/v1/order') else 'quotation'
            began = runtime.clock()
            write = str(method).upper() in ('POST','DELETE','PUT','PATCH')
            if write:
                runtime.note('order_transport_started', method=str(method).upper(), at=now())
            try:
                response = original(instance, method, url, **kwargs)
                if response.status_code >= 400:
                    runtime.record(group, False, runtime.clock()-began, 'HTTP_'+str(response.status_code))
                    return response  # Preserve SDK error handling; never retry writes.
                if group == 'accounts':
                    validate_balances(response.json())
                runtime.record(group, True, runtime.clock()-began)
                if write:
                    runtime.note('order_transport_returned', method=str(method).upper(),
                                 at=now(), elapsed_sec=round(runtime.clock()-began,3),
                                 http_status=response.status_code)
                return response
            except Exception as error:
                runtime.record(group, False, runtime.clock()-began, type(error).__name__)
                if write:
                    runtime.note('order_transport_unconfirmed', method=str(method).upper(),
                                 at=now(), elapsed_sec=round(runtime.clock()-began,3),
                                 error=type(error).__name__)
                raise

        bounded._upbit_bounded = True
        session.request = bounded
        self.flush(force=True)
        return original


runtime = Runtime()
