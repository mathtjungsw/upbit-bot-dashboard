import copy
import datetime as dt
import hashlib
import json
from pathlib import Path
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from unittest.mock import patch

from backend.reader import Reader
from backend.server import Application, Server, Store, handler
from web_dashboard_export import export_dashboard_snapshot
from buy_pause import new_buys_paused

NOW=dt.datetime(2026,10,16,11,0)
ORIGIN='https://mathtjungsw.github.io'


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.state={'positions':{'KRW-TEST':{'entry_ts':NOW.isoformat(),'avg_price':100,
                    'balance':1000,'stop_price':88,'trail_armed':True,'trail_arm':.04,
                    'trail_gap':.015}},'actual_performance':{'cashflow_tracker':{}},
                    'UPBIT_SECRET_KEY':'NEVER-EXPORT','last_scan_id':22}
        self.performance={'started_at':NOW.isoformat(),'return_pct':-10,
                          'adjusted_total_pnl_krw':-1000000,'net_contributions_krw':10000000}

    def export(self,**kwargs):
        return export_dashboard_snapshot(NOW,self.state,self.performance,{},9000000,
                9000000,100,{'price':104},path=str(self.root/'web_dashboard_snapshot.json'),**kwargs)

    def test_preserves_bot_state_and_uses_original_accounting(self):
        before=copy.deepcopy(self.state);data=self.export()
        self.assertEqual(before,self.state)
        self.assertEqual(data['account']['return_pct'],-10)
        self.assertEqual(data['account']['adjusted_total_pnl_krw'],-1000000)
        self.assertNotIn('NEVER-EXPORT',json.dumps(data))
        self.assertEqual(data['positions'][0]['exit_view']['price'],104)
        self.assertTrue(data['observed_at'].endswith('+09:00'))

    def test_local_buy_pause_missing_or_invalid_is_fail_closed(self):
        path=self.root/'pause.json'
        self.assertTrue(new_buys_paused(path))
        for value in (False,True):
            path.write_text(json.dumps({'paused':value}))
            self.assertEqual(new_buys_paused(path),value)
        path.write_text('{bad json')
        self.assertTrue(new_buys_paused(path))
        path.write_text('{"paused":"0"}')
        self.assertTrue(new_buys_paused(path))

    def test_invalid_numbers_are_unknown_and_atomic_write_keeps_previous(self):
        self.performance['return_pct']=float('nan');data=self.export()
        self.assertIsNone(data['account']['return_pct'])
        prior=(self.root/'web_dashboard_snapshot.json').read_bytes()
        with self.assertRaises(ValueError):self.export(policy={'bad':float('nan')})
        self.assertEqual(prior,(self.root/'web_dashboard_snapshot.json').read_bytes())
        self.assertFalse(list(self.root.glob('.web-snapshot-*')))

    def test_reader_requires_snapshot_and_does_not_recompute_returns(self):
        reader=Reader(self.root)
        with self.assertRaises(FileNotFoundError):reader.snapshot(True)
        self.export();data=reader.snapshot(True)
        self.assertEqual(data['account']['return_pct'],-10)
        self.assertFalse(data['research']['available'])

    def test_confirmed_full_exit_and_partial_event_exclusion(self):
        (self.root/'research_logs').mkdir()
        records=[{'event':'tp_partial','ts':NOW.isoformat(),'ticker':'KRW-TEST'},
                 {'event':'position_exit','ts':NOW.isoformat(),'ticker':'KRW-TEST',
                  'reason':'TRAIL_EXIT','realized':{'order_uuid':'one','net_realized_pnl':.025,
                    'net_pnl_krw':2500,'avg_fill_price':104,'sell_fee':20}}]
        path=self.root/'research_logs/2026-10.jsonl'
        path.write_text('\n'.join(json.dumps(r) for r in [*records,records[-1]]),encoding='utf-8')
        digest=hashlib.sha256(path.read_bytes()).hexdigest()
        rows=Reader(self.root).history()
        self.assertEqual(len(rows),1);self.assertEqual(rows[0]['return_pct'],2.5)
        self.assertEqual(rows[0]['pnl_krw'],2500)
        self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),digest)

    def test_research_keeps_experiment_times_and_frozen_status(self):
        raw={'research_started_at':NOW.isoformat(),'updated_at':NOW.isoformat(),
             'controls':[{'name':'20%','is_baseline':True,'marked_return_pct':1.2,
                          'config':{'max_price_ma20_distance':.2}}]}
        (self.root/'strategy8_research_summary.json').write_text(json.dumps(raw))
        data=Reader(self.root).research('strategy8_research_summary.json')
        self.assertEqual(data['rows'][0]['ma20_cap'],.2)
        self.assertFalse(data['frozen'])
        self.assertTrue(data['started_at'].endswith('+09:00'))


class AuthTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.path=Path(self.temp.name)/'auth.db';self.store=Store(self.path)

    def test_separate_password_required_and_sessions_exactly_seven_days(self):
        self.assertFalse(self.store.initialized())
        self.assertEqual(self.store.login('test-pass','peer')[1],'setup')
        self.store.setup('test-password-123')
        with patch('backend.server.time.time',return_value=100000):
            session,error=self.store.login('test-password-123','peer')
        self.assertIsNone(error);self.assertEqual(session['expires_at'],100000+7*86400)
        reopened=Store(self.path)
        with patch('backend.server.time.time',return_value=session['expires_at']-1):
            self.assertTrue(reopened.valid(session['token']))
        with patch('backend.server.time.time',return_value=session['expires_at']):
            self.assertFalse(reopened.valid(session['token']))
        with self.store.db() as db:
            serialized=str(db.execute('SELECT * FROM sessions').fetchall())
        self.assertNotIn(session['token'],serialized)

    def test_logout_password_reset_and_persistent_rate_limit(self):
        self.store.setup('test-password-123')
        session,_=self.store.login('test-password-123','peer');self.store.logout(session['token'])
        self.assertFalse(self.store.valid(session['token']))
        session,_=self.store.login('test-password-123','peer');self.store.setup('another-test-password')
        self.assertFalse(self.store.valid(session['token']))
        for _ in range(8):self.store.login('wrong','blocked')
        self.assertEqual(Store(self.path).login('wrong','blocked')[1],'rate')


class HttpTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        root=Path(self.temp.name)
        self.app=Application(root/'auth.db',root,[ORIGIN],lambda:True)
        self.app.store.setup('test-password-123')
        self.server=Server(('127.0.0.1',0),handler(self.app))
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
        self.addCleanup(self.server.server_close);self.addCleanup(self.server.shutdown)
        self.base='http://127.0.0.1:'+str(self.server.server_port)

    def request(self,path,body=None,origin=ORIGIN,token=None):
        headers={'Origin':origin,'Content-Type':'application/json'}
        if token:headers['Authorization']='Bearer '+token
        req=urllib.request.Request(self.base+'/upbit-api'+path,
              data=json.dumps(body).encode() if body is not None else None,headers=headers)
        try:
            response=urllib.request.urlopen(req,timeout=5)
        except urllib.error.HTTPError as error:response=error
        with response:return response.status,json.load(response),dict(response.headers)

    def test_auth_and_cors(self):
        self.assertEqual(self.request('/health')[0],200)
        self.assertEqual(self.request('/snapshot')[0],401)
        status,login,headers=self.request('/login',{'password':'test-password-123'})
        self.assertEqual(status,200);self.assertEqual(headers['Access-Control-Allow-Origin'],ORIGIN)
        self.assertEqual(self.request('/snapshot',origin='https://evil.example',token=login['token'])[0],403)
        self.assertEqual(self.request('/snapshot',token=login['token'])[0],503)
        self.assertEqual(self.request('/logout',{},token=login['token'])[0],200)
        self.assertEqual(self.request('/snapshot',token=login['token'])[0],401)

    def test_no_trading_or_control_endpoints_and_bad_json(self):
        _,login,_=self.request('/login',{'password':'test-password-123'})
        for route in ('/buy','/sell','/control'):
            self.assertEqual(self.request(route,{},token=login['token'])[0],404)
        self.assertEqual(self.request('/login',{'password':'x'},origin='https://evil.example')[0],403)


if __name__=='__main__':unittest.main()
