const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>v===null||v===undefined?null:Number.isFinite(Number(v))?Number(v):null;
const money=v=>n(v)===null?'—':Math.round(n(v)).toLocaleString('ko-KR')+'원';
const pct=v=>n(v)===null?'—':(n(v)>0?'+':'')+n(v).toFixed(2)+'%';
const names={existing:'1 · 기존 전략',random:'2 · 무작위 트레일링',morning:'3 · 아침 전략'};
const when=v=>v?new Date(v).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false}):'—';

export function splitOverview(d){
 const s=d.split_portfolio,eq=n(s.equity_krw),principal=n(d.account.net_contributions_krw);
 const qualified=s.account_qualified&&!s.hold&&eq!==null;
 const profit=qualified&&principal!==null?eq-principal:null;
 const rate=profit!==null&&principal>0?profit/principal*100:null;
 return '<section class="hero-account"><div class="hero-head"><span>세 전략 분할 운용</span><span>33% · 33% · 33% · 예비금 1%</span></div>'+
 '<div class="hero-main"><div><span>운용 원화·코인 평가액</span><strong>'+money(eq)+'</strong></div><div><span>누적 손익 / 원금 대비</span><strong>'+money(profit)+' / '+pct(rate)+'</strong></div></div>'+
 '<p>과거 잔량 5종은 별도 보존 · 평가액은 현재 매수호가 기준, 향후 매도수수료 차감 전</p></section>'+
 ((!qualified||s.error)?'<p class="notice">체결·계좌 대사 확인 중: '+esc(s.hold||s.error||'미체결 주문 또는 관측 확인 필요')+' · 미확인 수익률은 표시하지 않습니다.</p>':'')+
 '<p class="period-note">세 전략 모두 코인·대기 주문이 없을 때만 다시 분할합니다. '+(s.morning_live_enabled?'아침 전략 실전 · 09:00 조건 충족 시에만 진입':'아침 전략 신규 실주문 OFF')+'</p>'+
 '<div class="holdings-grid">'+s.sleeves.map(v=>{
  const p=v.position,avg=p?n(p.funds)/n(p.qty):null;
  const arm=v.id==='random'?10:4,gap=v.id==='random'?3:1.5;
  const line=p?avg*(1+(p.armed?n(p.peak)-gap/100:arm/100)):null;
  return '<article class="holding"><div class="holding-top"><h3>'+esc(names[v.id]||v.id)+'</h3><span>'+esc(p?p.market.replace('KRW-',''):'현금')+'</span></div>'+
   '<div class="holding-price"><strong>'+money(v.equity_krw)+'</strong><b>'+pct(v.return_pct)+'</b></div>'+
   '<div class="position-levels"><div><span>보유 현금</span><strong>'+money(v.cash_krw)+'</strong></div><div><span>실현손익 · 수수료 반영</span><strong>'+money(v.realized_krw)+'</strong></div></div>'+
   (p?'<p>잔여 '+esc(p.qty)+'개 · 평단 '+esc(avg?.toLocaleString('ko-KR',{maximumFractionDigits:8}))+'원</p><p>현재가 '+money(v.price)+' · '+(p.armed?'트레일 청산 기준':'트레일 발동 기준')+' '+money(line)+'</p>':'')+
   '<p class="position-order-note">'+(v.id==='random'?'가격 손절 없음 · 트레일 10% / 3%p · 유의 지정 시 예외 매도':v.id==='existing'?'가격 손절 -6% · 트레일 4% / 1.5%p · 기존 진입 조건':'09:00 지정가 IOC · 가격 손절 -2% · 트레일 4% / 1.5%p')+'</p>'+
   (v.id==='morning'&&s.morning_status?'<p>'+esc(s.morning_status.candidate||'후보 없음')+' · '+esc(s.morning_status.reason||'대기')+'</p>':'')+
   (p?.last_exit_reason?'<p class="notice">청산 진행: '+esc(p.last_exit_reason)+'</p>':'')+'</article>';
 }).join('')+'</div>'+
 '<p>공통 예비금 '+money(s.reserve_krw)+' · 대기 주문 '+esc(s.pending_orders)+'건 · 재분배 '+esc(s.rebalance_generation)+'회</p>'+
 '<p class="footnote">새 분할 운용의 기간 TWR 연결은 검증 전입니다. 과거 기간수익률을 현재 값으로 표시하지 않습니다. 업데이트 '+esc(when(s.updated_at))+'</p>'+
 morningResearch(d.morning_research)+
 '<section><div class="section-heading"><h2>최근 분할 매매</h2></div>'+splitOrders(d,5)+'</section>';
}
function splitOrders(d,limit){
 const rows=(d.split_portfolio.recent_orders||[]).filter(o=>n(o.qty)>0).slice(0,limit);
 if(!rows.length)return '<p>새 분할 전략의 확인된 체결 기록이 아직 없습니다.</p>';
 return rows.map(o=>'<article class="holding"><h3>'+esc(names[o.owner])+' · '+esc(o.market)+' · '+(o.side==='BUY'?'매수':'매도')+'</h3>'+
  '<p>'+esc(when(new Date(Number(o.created_at)*1000).toISOString()))+' · 체결 '+esc(o.qty)+'개 · '+(o.terminal?'주문 종료':'부분체결 확인 중')+'</p>'+
  '<p>체결가 '+money(n(o.funds)/n(o.qty))+' · 수수료 '+money(o.fee)+(o.side==='SELL'?' · 해당 주문 순손익 '+money(o.realized_krw):'')+'</p>'+
  '<p class="footnote">주문별 누적 체결 기준입니다. 부분매도 잔여 수량은 전략 카드에 표시합니다.</p></article>').join('');
}
export function splitHistory(d){return '<section><h2>분할 운용 체결 기록</h2>'+splitOrders(d,100)+'<p class="footnote">분할 전 매매 원본과 기존 손익 원장은 서버에 보존합니다.</p></section>';}

export function morningResearch(r){
 if(!r||r.paper_only!==true||r.live_orders_enabled!==false)return '';
 const p=(r.models||[]).find(m=>m.id===r.primary),missing=r.input_incomplete_days||[];
 return '<section class="holding"><div class="holding-top"><h3>아침 전략 · 가상 연구</h3><span>실주문 OFF</span></div>'+
 '<p>실제 계좌와 별도 집계 · 가상 계좌 시작금 '+money(r.assumptions?.initial_cash)+'</p>'+
 '<div class="holding-price"><strong>'+pct(p?.return_pct)+'</strong><b>'+esc(p?.closed_trades??0)+'회 완료</b></div>'+
 '<p>주 후보: 상승형 · 손절 -2% · 트레일 4% / 1.5%p</p>'+
 '<p>'+esc(r.start_date)+' ~ '+esc(r.end_date)+' · '+esc(r.review)+'</p>'+
 '<p>금일 후보 '+esc(r.today?.primary_selected||'없음 / 관측 대기')+' · 완료 거래일 '+esc(r.primary_completed_trade_days??0)+'일 / 최소 '+esc(r.minimum_trade_days??25)+'일</p>'+
 (missing.length?'<p class="notice">입력 미확인 '+esc(missing.length)+'일 — 무신호·수익률 0으로 간주해 검증하지 않습니다.</p>':'')+
 (r.today?.reason?'<p class="notice">금일 진입 보류: '+esc(r.today.reason)+'</p>':'')+
 '<details><summary>가상 비교군 '+esc((r.models||[]).length)+'개 보기</summary>'+
 (r.models||[]).map(m=>'<p>'+esc(m.id)+' · '+pct(m.return_pct)+' · '+esc(m.closed_trades)+'회'+(m.position?' · 보유 '+esc(m.position.market):' · 현금')+'</p>').join('')+'</details>'+
 '<p class="footnote">호가 잔량으로 추정한 가상 체결이며 실제 체결·수익 보장이 아닙니다. 자동 실전 전환 없음. 갱신 '+esc(when(r.updated_at))+'</p></section>';
}
