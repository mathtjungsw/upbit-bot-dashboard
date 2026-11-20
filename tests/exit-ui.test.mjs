import test from 'node:test';
import assert from 'node:assert/strict';
import {splitOverview,splitHistory,surgeResearch,exitLabel} from '../docs/split-ui.js';
import {splitFixture} from '../docs/demo.js';

function data(){
 const d=splitFixture(),t=Date.now()/1000;
 d.split_portfolio.surge_exit_policy={unarmed_seconds:1200};
 d.split_portfolio.surge_status={reason:'HOLDING',protection:{checked_at:t,quote_quality:'FULL_DEPTH',liquidation_price:104,gross_return_pct:4}};
 d.split_portfolio.sleeves.push({id:'surge',cash_krw:0,equity_krw:10400,realized_krw:0,price:104,return_pct:4,
  position:{market:'KRW-DEMO',qty:100,funds:10000,entry_fees:5,peak:.04,armed:true,opened_at:t-100}});
 return d;
}
test('new server policy renders 20m while legacy server remains 10m',()=>{
 const d=data();assert.match(splitOverview(d),/미발동 20분 종료/);
 delete d.split_portfolio.surge_exit_policy;assert.match(splitOverview(d),/미발동 10분 종료/);
});
test('armed status, whole-position price, and fee-adjusted indication are distinct',()=>{
 const html=splitOverview(data());assert.match(html,/트레일링 가동 중/);
 assert.match(html,/시간 청산 적용 안 함/);assert.match(html,/전량 매도 예상 평균가/);
 assert.match(html,/3\.90%/);assert.match(html,/실제 체결가가 아닙니다/);
});
test('stale or shallow quote does not display a forecast return',()=>{
 for(const change of [{checked_at:Date.now()/1000-10},{quote_quality:'INSUFFICIENT_DEPTH'}]){
  const d=data();Object.assign(d.split_portfolio.surge_status.protection,change);
  const html=splitOverview(d);assert.match(html,/호가 미확인/);assert.doesNotMatch(html,/3\.90%/);
 }
});
test('timeout and price stop labels never conflate',()=>{
 assert.equal(exitLabel('SURGE_UNARMED_20M'),'미발동 20분 시간 청산');
 assert.equal(exitLabel('SURGE_STOP'),'가격 손절');
 const d=data();d.split_portfolio.recent_orders=[{id:'x',owner:'surge',side:'SELL',market:'KRW-A',qty:1,funds:100,fee:.05,cost_basis_krw:101,realized_krw:-1.05,terminal:true,created_at:Date.now()/1000,exit_reason:'SURGE_UNARMED_20M'}];
 assert.match(splitHistory(d),/미발동 20분 시간 청산/);
 delete d.split_portfolio.recent_orders[0].exit_reason;
 assert.match(splitHistory(d),/과거 사유 기록 없음/);
});
test('separate simultaneous timeout cohort does not relabel historical baseline',()=>{
 const html=surgeResearch({paper_only:true,live_orders_enabled:false,input_ready:true,models:[
  {id:'base',qualified:true,return_pct:3,closed:4},
  ...[10,20,30].map(t=>({id:'timeout'+t+'_v1',cohort:'timeout-v1',started_at:Date.now()/1000,qualified:true,return_pct:0,closed:0}))]});
 assert.match(html,/기존 기준 · 10분/);assert.match(html,/20분 · 실전 시간 조건/);
 assert.match(html,/동시 시작/);assert.match(html,/실전 한시해제와 다릅니다/);
});
