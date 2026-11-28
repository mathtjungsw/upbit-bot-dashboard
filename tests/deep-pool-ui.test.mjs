import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deepOverview,deepHistory,deepResearch} from '../docs/deep-pool.mjs';

const slots=()=>Array.from({length:5},(_,i)=>({slot:i+1,status:'flat',cash_krw:10000,realized_krw:0,unrealized_krw:0}));
const state=(s=slots())=>({deep_pool:{slots:s,version:'deep-pool-v1',mode:'live',initial:50000}});
test('snapshot controls count and money; zero is readable',()=>{
 const r=deepOverview(state());
 assert.match(r,/보유 0 \/ 5/);
 assert.match(r,/0\.00%/);
 assert.match(r,/50,000원/);
 assert.equal((r.match(/<article /g)||[]).length,5);
});
test('unknown marks are not treated as zero; untrusted slot fields are not rendered',()=>{
 const s=slots();Object.assign(s[0],{status:'held',market:'<img onerror=alert(1)>',unrealized_krw:null});
 s[1].status='constructor';
 const r=deepOverview(state(s));
 assert.match(r,/누적 수익률<\/dt><dd class="dp-neutral">—/);
 assert.match(r,/상태 미확인/);
 assert.doesNotMatch(r,/<img|onerror|constructor/);
 assert.match(deepOverview(state([])),/원장 자료를 확인할 수 없습니다/);
 assert.equal(deepOverview({}),null);
});
test('pause, per-slot return and cooling are separate',()=>{
 const s=slots();Object.assign(s[0],{status:'cooling',cooldown_minutes:18});
 Object.assign(s[1],{status:'held',market:'KRW-TOKEN',position_pct:-2.46,trail_floor:44.76,unrealized_krw:-246});
 const r=deepOverview({deep_pool:{...state(s).deep_pool,paused:true}});
 assert.match(r,/재진입까지 18분/);
 assert.match(r,/보유 1 \/ 5/);
 assert.match(r,/−2\.46%/);
 assert.match(r,/44\.76원/);
 assert.match(r,/신규 매수 중지/);
});
test('history is KST and distinguishes no fills from amounts',()=>{
 const r=deepHistory({deep_pool:{recent:[{slot:3,market:'KRW-C',side:'SELL',qty:'0',fee:'0',at:'2026-11-28T16:20:00Z'},
   {side:'BUY',market:'<script>',qty:null,fee:null}]}});
 assert.match(r,/11\.29 01:20 KST/);
 assert.match(r,/체결 없음/);
 assert.match(r,/수수료 <span class="dp-order-fee">—/);
 assert.doesNotMatch(r,/<script>/);
 assert.match(deepResearch(),/실전과 별도/);
});
