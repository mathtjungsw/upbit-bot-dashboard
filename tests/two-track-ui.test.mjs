import test from 'node:test';
import assert from 'node:assert/strict';
import {twoTrackResearch} from '../docs/two-track-ui.js';
const r=()=>({version:'morning-two-track-v1-20261109',paper_only:true,live_orders_enabled:false,start_date:'2026-11-10',end_date:'2026-12-07',valid_finalized_days:0,models:[{id:'L_signal_p1',return_pct:'0',equity_krw:'1000000',realized:'0',closed_trades:0}]});
test('prestart does not show zero return as observed performance',()=>{const h=twoTrackResearch(r());assert.match(h,/開始前|시작 전/);assert.doesNotMatch(h,/0\.00%/);assert.match(h,/5만원/);});
test('only authenticated paper schema is rendered',()=>{assert.equal(twoTrackResearch({...r(),live_orders_enabled:true}),'');assert.equal(twoTrackResearch(null),'');});
test('observed figures and hostile labels are safely rendered',()=>{const x=r();x.today={errors:{'<script>':['issue']}};x.models=[{id:'<script>',return_pct:null}];const h=twoTrackResearch(x);assert.doesNotMatch(h,/<script>/);assert.match(h,/자동 실전 전환은 없습니다/);});
