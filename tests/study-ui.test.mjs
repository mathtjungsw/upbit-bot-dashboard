import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewNotice,runtimePanel,exitResearch} from '../docs/study-ui.js';

test('no start date is fabricated before activation',()=>{
 const html=reviewNotice(null);assert.match(html,/시작 대기/);assert.doesNotMatch(html,/점검 필요/);
});
test('overdue review stays prominent with both dates',()=>{
 const html=reviewNotice({status:'due',message:'2주 중간 점검 필요',started_at:'2026-11-01T09:00:00+09:00',elapsed_days:15,
 milestones:[{title:'2주 중간 점검',status:'due',due_at:'2026-11-15T09:00:00+09:00'},
 {title:'4주 전략 분석·검토',status:'upcoming',due_at:'2026-11-29T09:00:00+09:00',remaining_days:13}]});
 assert.match(html,/role="status"/);assert.match(html,/완료 기록 전까지 유지/);assert.match(html,/13일 남음/);
 assert.match(html,/자동 실행되지는 않습니다/);
});
test('research and runtime content are escaped',()=>{
 const html=exitResearch({available:true,rows:[{name:'<script>bad</script>',open_ticker:'KRW-<bad>',marked_return_pct:null}]});
 assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/—/);
 const health=runtimePanel({failures:{'<bad>':{}},last_success:{},last_loop_at:null});
 assert.match(health,/감시 상태 확인 필요/);assert.doesNotMatch(health,/<bad>/);
});
test('fresh loop can still show buy-blocked status',()=>{
 const now=Date.parse('2026-11-01T09:00:00+09:00');
 assert.match(runtimePanel({last_loop_at:new Date(now).toISOString(),buy_blocked:true,failures:{}},now),/신규매수 보류/);
});
