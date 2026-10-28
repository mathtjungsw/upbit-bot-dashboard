import datetime as dt
import json
from pathlib import Path
import tempfile
import types
import unittest
from bot_runtime import Runtime, validate_balances
from backend.review_schedule import schedule, KST


class RuntimeTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.t=0;self.calls=[];self.response=types.SimpleNamespace(status_code=200,json=lambda:[
            dict(currency='KRW',balance='100',locked='0',avg_buy_price='0')])
        self.failure=None
        owner=self
        class Session:
            def request(self,method,url,**kwargs):
                owner.calls.append((method,url,kwargs))
                if owner.failure:raise owner.failure
                return owner.response
        self.session=Session();self.module=types.SimpleNamespace(sessions=types.SimpleNamespace(Session=Session))
        self.runtime=Runtime(Path(self.temp.name)/'health.json',clock=lambda:self.t)
        self.runtime.install(self.module)

    def test_timeout_none_bounded_and_other_hosts_untouched(self):
        self.session.request('GET','https://api.upbit.com/v1/accounts',timeout=None)
        self.assertEqual(self.calls[-1][2]['timeout'],(3.,5.))
        self.session.request('GET','https://other.example/v1/accounts',timeout=None)
        self.assertIsNone(self.calls[-1][2]['timeout'])
        self.session.request('GET','https://api.upbit.com/v1/accounts',timeout=(1,2))
        self.assertEqual(self.calls[-1][2]['timeout'],(1.,2.))

    def test_unknown_post_result_is_not_retried_or_swallowed(self):
        self.failure=TimeoutError('SECRET HEADER should never be logged')
        with self.assertRaises(TimeoutError):self.session.request('POST','https://api.upbit.com/v1/orders',json={'secret':'hidden'})
        self.assertEqual(len(self.calls),1)
        saved=self.runtime.path.read_text()
        self.assertNotIn('SECRET',saved);self.assertNotIn('hidden',saved)
        self.assertEqual(self.runtime.data['failures']['order']['error'],'TimeoutError')

    def test_new_buy_requires_recent_valid_account_and_recovers(self):
        self.assertFalse(self.runtime.can_buy())
        self.session.request('GET','https://api.upbit.com/v1/accounts')
        self.assertTrue(self.runtime.can_buy())
        self.failure=TimeoutError()
        with self.assertRaises(TimeoutError):self.session.request('GET','https://api.upbit.com/v1/ticker')
        self.assertFalse(self.runtime.can_buy())
        self.failure=None;self.session.request('GET','https://api.upbit.com/v1/ticker')
        self.assertTrue(self.runtime.can_buy())
        self.t=61;self.assertFalse(self.runtime.can_buy())

    def test_invalid_balance_never_becomes_zero(self):
        for value in (None,{},[],[{'currency':'KRW'}],[dict(currency='KRW',balance='nan',locked='0',avg_buy_price='0')]):
            with self.subTest(value=value),self.assertRaises(ValueError):validate_balances(value)
        self.response.json=lambda:[]
        with self.assertRaises(ValueError):self.session.request('GET','https://api.upbit.com/v1/accounts')
        self.assertFalse(self.runtime.can_buy())

    def test_http_error_preserves_sdk_response_and_blocks(self):
        self.response.status_code=429
        result=self.session.request('GET','https://api.upbit.com/v1/accounts')
        self.assertIs(result,self.response);self.assertFalse(self.runtime.can_buy())

    def test_loop_gap_and_install_once(self):
        self.runtime.loop_started();self.t=120;self.runtime.loop_started()
        self.assertEqual(self.runtime.data['loop_gap_sec'],120)
        with self.assertRaises(RuntimeError):self.runtime.install(self.module)


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);self.start=dt.datetime(2026,11,1,9,tzinfo=KST)
        self.study=dict(available=True,started_at=self.start.isoformat(),version='v9',manifest_hash='fixed')

    def at(self,days):return schedule(self.root,self.study,self.start+dt.timedelta(days=days))

    def test_not_started_and_exact_boundaries(self):
        self.assertEqual(schedule(self.root,{},self.start)['status'],'not_started')
        self.assertEqual(self.at(13.999)['milestones'][0]['status'],'upcoming')
        self.assertEqual(self.at(14)['milestones'][0]['status'],'due')
        self.assertEqual([m['status'] for m in self.at(28)['milestones']],['due','due'])
        self.assertEqual(self.at(60)['status'],'due')

    def test_completion_requires_same_study_and_report_after_due(self):
        data=dict(study_version='v9',manifest_hash='fixed',started_at=self.start.isoformat(),
                  completed={'14':dict(completed_at=(self.start+dt.timedelta(days=15)).isoformat(),report='report.md')})
        path=self.root/'research_review_completions.json'
        path.write_text(json.dumps(data))
        self.assertEqual(self.at(15)['milestones'][0]['status'],'completed')
        self.assertEqual(self.at(28)['milestones'][1]['status'],'due')
        data['manifest_hash']='other';path.write_text(json.dumps(data))
        self.assertEqual(self.at(15)['milestones'][0]['status'],'due')

    def test_bad_completion_retains_alert_and_start_is_not_install_time(self):
        for invalid in ('{bad','[]','null'):
            (self.root/'research_review_completions.json').write_text(invalid)
            self.assertEqual(self.at(14)['status'],'due')
            self.assertIsNotNone(self.at(14)['warning'])
        self.study['started_at']=(self.start+dt.timedelta(days=1)).isoformat()
        self.assertEqual(schedule(self.root,self.study,self.start)['status'],'invalid')
