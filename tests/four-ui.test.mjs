import test from 'node:test';
import assert from 'node:assert/strict';
import {splitOverview,splitHistory,surgeResearch} from '../docs/split-ui.js';
import {splitFixture} from '../docs/demo.js';
test('four strategy plan and surge status render without confusing stop levels',()=>{
 const d=splitFixture();d.split_portfolio.version='split-four-v2';d.split_portfolio.surge_live_enabled=true;
 d.split_portfolio.surge_status={reason:'WARMING_UP',feed:{warmup_remaining:150}};
 d.split_portfolio.sleeves.push({id:'surge',cash_krw:1000000,equity_krw:1000000,realized_krw:0,position:null});
 const html=splitOverview(d);
 assert.match(html,/실시간 급등/);assert.match(html,/배정 현금 전액/);assert.match(html,/약 3분/);
 assert.match(html,/24.75%/);assert.match(html,/손절 -2%/);assert.match(html,/매도 후 10분/);
 assert.match(splitHistory(d),/data-split-owner="surge"/);
});
test('paper disqualification never shows a valid 0 percent',()=>{
 const html=surgeResearch({paper_only:true,live_orders_enabled:false,models:[{id:'base',qualified:false,return_pct:0,closed:2}]});
 assert.match(html,/판정 제외/);assert.doesNotMatch(html,/0\.00%/);
});
