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
