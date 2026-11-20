import test from 'node:test';
import assert from 'node:assert/strict';
import {splitOverview,splitHistory} from '../docs/split-ui.js';
import {soloFixture} from '../docs/demo.js';
test('solo trial separates archived history and temporary daily waiver',()=>{
 const d=soloFixture(),html=splitOverview(d);
 assert.match(html,/전략4 단독시험/);assert.match(html,/한시 해제/);
 assert.match(html,/중지한 전략 1·2·3/);assert.match(html,/시험 시작 이후 수익률/);
 assert.doesNotMatch(html,/24\.75%/);assert.doesNotMatch(html,/\/ 8회/);
 assert.equal((html.match(/class="sd-card"/g)||[]).length,1);
 assert.match(html,/가상 비교군은 변경하지/);
});
test('expired daily waiver and unqualified returns are explicit',()=>{
 const d=soloFixture();d.split_portfolio.solo_trial.daily_entry_limit=8;
 d.split_portfolio.solo_trial.review_due=true;d.split_portfolio.account_qualified=false;
 const html=splitOverview(d);assert.match(html,/8회 제한은 복구/);assert.doesNotMatch(html,/한시 해제/);
 assert.match(html,/시험 시작 이후 수익률<\/dt><dd class="">—/);
});
test('operator liquidation is distinguished from strategy exit',()=>{
 const d=soloFixture();d.split_portfolio.recent_orders[0].exit_reason='OPERATOR_SURGE_ONLY';
 assert.match(splitHistory(d),/단독 전환 청산/);
});

test('missing streak metadata keeps original three-loss display',()=>{
 const d=soloFixture(),html=splitOverview(d);
 assert.match(html,/3연속 손실 차단 <b>적용<\/b>/);
 assert.match(html,/\/ 3회/);
 assert.doesNotMatch(html,/차단 한시 해제 \(횟수 기록 유지\)/);
});

test('effective streak waiver shows count, expiry and retained protection',()=>{
 const d=soloFixture(),s=d.split_portfolio;
 s.solo_trial.consecutive_loss_limit=null;
 s.solo_trial.consecutive_loss_waiver={until:s.solo_trial.review_at};
 s.surge_days={'2026-11-20':{losses:4,entries:6,blocked:true}};
 const html=splitOverview(d);
 assert.match(html,/연속 손실 4회 · 차단 한시 해제/);
 assert.doesNotMatch(html,/\/ 3회/);
 assert.match(html,/3연속 손실 차단 <b>한시 해제<\/b>/);
 assert.match(html,/당일 -5% 차단은 유지/);
 assert.match(html,/종목당 하루 2회/);
 assert.match(html,/자동 복구 · 손실 횟수는 계속 기록/);
});

test('expired streak metadata displays applied limit instead of waiver',()=>{
 const d=soloFixture(),s=d.split_portfolio;
 s.solo_trial.consecutive_loss_limit=3;
 s.solo_trial.consecutive_loss_waiver={until:1};
 const html=splitOverview(d);
 assert.match(html,/3연속 손실 차단 <b>적용<\/b>/);
 assert.doesNotMatch(html,/차단 한시 해제 \(횟수 기록 유지\)/);
});

test('legacy NAV field missing preserves the daily loss protection display',()=>{
 const html=splitOverview(soloFixture());
 assert.match(html,/당일 -5% 차단 <b>적용<\/b>/);
 assert.match(html,/당일 -5% 차단은 유지/);
});

test('daily NAV waiver has an expiry, keeps P&L and boundary protection explicit',()=>{
 const d=soloFixture(),s=d.split_portfolio;
 s.solo_trial.daily_nav_loss_limit_pct=null;
 s.solo_trial.daily_nav_loss_waiver={until:s.solo_trial.review_at};
 s.surge_risk={return_pct:-8,boundary_gap:true,blocked:true};
 const html=splitOverview(d);
 assert.match(html,/당일 -5% 차단 <b>한시 해제<\/b>/);
 assert.match(html,/오늘 전략 수익률 -8\.00%/);
 assert.match(html,/자동 복구 · 당일 손익은 계속 기록/);
 assert.match(html,/날짜 경계 관측 공백 · 신규 진입 중지/);
 assert.match(html,/손절 -2%/);
 assert.doesNotMatch(html,/당일 -5% 차단은 유지/);
});

test('expired NAV waiver with retained historical metadata shows applied limit',()=>{
 const d=soloFixture(),s=d.split_portfolio;
 s.solo_trial.daily_nav_loss_limit_pct=-5;
 s.solo_trial.daily_nav_loss_waiver={until:1};
 const html=splitOverview(d);
 assert.match(html,/당일 -5% 차단 <b>적용<\/b>/);
 assert.doesNotMatch(html,/당일 손실 -5% 차단 한시 해제/);
});
