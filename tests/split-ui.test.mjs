import test from 'node:test';
import assert from 'node:assert/strict';
import {strategyMetrics,splitOverview,splitHistory,morningResearch} from '../docs/split-ui.js';
import {splitFixture} from '../docs/demo.js';

test('remaining cost includes buy fee; realized and unrealized sum once',()=>{
 const m=strategyMetrics({cash_krw:'250',equity_krw:'1050',realized_krw:'40',position:{funds:'700',entry_fees:'10'}});
 assert.deepEqual([m.unrealized,m.total,m.netAssigned],[90,130,920]);
 assert.equal(m.rate,130/920*100);
});
test('cash reallocation changes net contribution but not realized profit',()=>{
 const a=strategyMetrics({cash_krw:'1100',equity_krw:'1100',realized_krw:'100',position:null});
 const b=strategyMetrics({cash_krw:'1050',equity_krw:'1050',realized_krw:'100',position:null});
 assert.deepEqual([a.total,b.total,a.netAssigned,b.netAssigned],[100,100,1000,950]);
});
test('a nonpositive net capital keeps won P&L but suppresses the percentage',()=>{
 const m=strategyMetrics({cash_krw:'100',equity_krw:'100',realized_krw:'200'});
 assert.equal(m.total,200); assert.equal(m.rate,null);
});
test('missing valuation or missing entry fees do not masquerade as a zero cost',()=>{
 for(const v of [{equity_krw:null,position:{funds:'20',entry_fees:'1'}},{equity_krw:'100',position:{funds:'20'}}]){
  const m=strategyMetrics({cash_krw:'50',realized_krw:'2',...v});
  assert.deepEqual([m.unrealized,m.total,m.rate],[null,null,null]);
 }
});
test('unqualified snapshot hides derived returns but keeps confirmed realized P&L',()=>{
 const d=splitFixture();
 d.split_portfolio.hold='unconfirmed';
 const html=splitOverview(d);
 assert.match(html,/계좌 확인 필요/); assert.doesNotMatch(html,/\+7\.09%/); assert.match(html,/\+54,000원/);
});
test('stale account does not display derived return as live',()=>{
 const d=splitFixture();d.split_portfolio.updated_at='2020-01-01T00:00:00Z';
 assert.match(splitOverview(d),/계좌 확인 필요/);
 assert.doesNotMatch(splitOverview(d),/-5\.67%/);
});
test('separate owner and side filters skip unfilled and show actual trade basis',()=>{
 const d=splitFixture();
 d.split_portfolio.recent_orders.unshift({id:'notfilled',owner:'morning',side:'SELL',qty:'0'});
 const html=splitHistory(d,{owner:'morning',side:'SELL'});
 assert.match(html,/조회 결과 5건/);assert.doesNotMatch(html,/order-notfilled|ALPHA|BETA/);
 assert.match(html,/잔량 취소 · 체결 있음/);
 assert.match(html,/매수·매도 수수료 반영/);
});
test('pagination clamps to last page after updated results',()=>{
 const html=splitHistory(splitFixture(),{page:100});
 assert.match(html,/4 \/ 4/);assert.equal((html.match(/class="sd-order"/g)||[]).length,2);
});
test('untested paper performance is not shown as zero and content is escaped',()=>{
 const d=splitFixture();
 const r={...d.morning_research,elapsed_calendar_days:0,models:[{id:'<script>',return_pct:0}]};
 const html=morningResearch(r);
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|0\.00%/);
 assert.equal(morningResearch({...r,live_orders_enabled:true}),'');
});
