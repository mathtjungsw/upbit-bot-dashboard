const names={existing:['01','기존 전략','추세·선별 매매'],random:['02','무작위 트레일링','매도 후 10분 대기'],morning:['03','아침 전략','09:00 지정가 IOC'],surge:['04','실시간 급등','배정 현금 전액 · 지정가 IOC']};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:8});
const whole=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0});
const date=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const clock=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
const n=v=>(typeof v==='number'||(typeof v==='string'&&v.trim()!==''))&&Number.isFinite(Number(v))?Number(v):null;
const sign=v=>v>0?'+':'';
const money=(v,signed=false)=>n(v)===null?'—':(signed?sign(n(v)):'')+whole.format(n(v))+'원';
const price=v=>n(v)===null?'—':number.format(n(v))+'원';
const pct=v=>n(v)===null?'—':sign(n(v))+n(v).toFixed(2)+'%';
const tone=v=>n(v)>0?'gain':n(v)<0?'drop':'';
const coin=v=>esc(String(v??'').replace(/^KRW-/,'')||'—');
const fmt=(v,formatter=date)=>Number.isFinite(v)&&Math.abs(v)<=8.64e15?formatter.format(v):'—';
const timestamp=v=>n(v)===null?NaN:n(v)*1000;
const more={daily_tp:'하루 첫 익절',repeat_tp:'반복 익절'};
const label=id=>names[id]?.[1]||more[id]||id;
const heading=(title,hint='')=>'<div class="sd-heading"><h2>'+title+'</h2>'+hint+'</div>';
const chip=(title,t='')=>'<span class="sd-chip '+t+'">'+esc(title)+'</span>';
const metric=(title,value,t='')=>'<div><dt>'+title+'</dt><dd class="'+t+'">'+value+'</dd></div>';
const empty=text=>'<p class="sd-empty">'+text+'</p>';
export function exitLabel(reason){
 return ({SURGE_STOP:'가격 손절',SURGE_STOP_THIN_BOOK:'가격 손절 · 호가 깊이 부족',
  SURGE_TRAIL:'트레일링 청산',SURGE_TRAIL_THIN_BOOK:'트레일링 청산 · 호가 깊이 부족',
  SURGE_UNARMED_10M:'미발동 10분 시간 청산',SURGE_UNARMED_20M:'미발동 20분 시간 청산',
  SURGE_UNARMED_30M:'미발동 30분 시간 청산',SURGE_WARNING:'유의 지정 청산',
  OPERATOR_SURGE_ONLY:'전략4 단독 전환 청산'})[reason]||reason||'과거 사유 기록 없음';
}

function protectionPanel(p,s){
 if(!p)return '';
 const v=s.surge_status?.protection||p.exit_audit?.last_observation;
 const seconds=n(s.surge_exit_policy?.unarmed_seconds)??600;
 const due=timestamp(p.opened_at)+seconds*1000;
 const age=v?Date.now()-timestamp(v.checked_at):Infinity;
 const fresh=v&&age>=-1000&&age<=5000&&v.quote_quality==='FULL_DEPTH';
 const gross=fresh?n(v.gross_return_pct):null;
 const qty=n(p.qty),cost=n(p.funds)!==null&&n(p.entry_fees)!==null?n(p.funds)+n(p.entry_fees):null;
 const net=fresh&&qty>0&&cost>0?100*(qty*n(v.liquidation_price)*.9995/cost-1):null;
 return '<div class="sd-exit-monitor"><p>'+chip(p.armed?'트레일링 가동 중':'트레일링 발동 대기',p.armed?'active':'')+
  (p.armed?' · 시간 청산 적용 안 함':' · '+fmt(due,clock)+' KST 시간 청산 예정')+'</p><dl class="sd-metrics">'+
  metric('전량 매도 예상 평균가',fresh?price(v.liquidation_price):'호가 미확인')+
  metric('예상 순수익률',pct(net),tone(net))+metric('관측 최고 가격수익률',pct(n(p.peak)===null?null:n(p.peak)*100))+
  metric('호가 확인 KST',v?fmt(timestamp(v.checked_at),clock):'—')+'</dl>'+
  '<p class="sd-note">전량 예상가는 공개 호가 기준이며 실제 체결가가 아닙니다. 예상 순수익률은 매수 수수료와 매도 수수료 0.05% 가정 포함.'+
  (!fresh?' 호가 부족·지연 시 예상 수익률을 표시하지 않습니다.':' 가격 기준 '+pct(gross)+'.')+'</p></div>';
}

export function strategyMetrics(v,qualified=true){
 const cash=n(v.cash_krw),equity=n(v.equity_krw),realized=n(v.realized_krw);
 const p=v.position, funds=n(p?.funds), fees=n(p?.entry_fees);
 const cost=p?(funds!==null&&fees!==null&&funds>=0&&fees>=0?funds+fees:null):0;
 const unrealized=p?(equity!==null&&cash!==null&&cost!==null?equity-cash-cost:null):0;
 const netAssigned=n(v.capital_krw)??(cash!==null&&cost!==null&&realized!==null?cash+cost-realized:null);
 const total=qualified&&equity!==null&&realized!==null&&unrealized!==null?realized+unrealized:null;
 return {cash,equity,realized,unrealized:qualified?unrealized:null,netAssigned:qualified?netAssigned:null,
  total,rate:total!==null&&netAssigned>0?100*total/netAssigned:null};
}

function readableStatus(v){
 return ({WAIT_0859_FRAME:'아침 관측 대기',PREPARING:'매수 조건 확인 중',NO_SIGNAL:'조건을 충족한 후보 없음',
  READY:'매수 기회 대기',ORDER_PENDING:'주문 확인 중',HOLDING:'보유 감시 중',EXIT_PENDING:'청산 확인 중',
  EXIT_PENDING_QUOTE:'청산 호가 확인 중',ORDER_TERMINAL:'주문 처리 완료',WINDOW_MISSED:'매수 시간 경과',
  CHECK_OR_ORDER_NOT_CONFIRMED:'매수 조건 또는 주문 확인 필요',CLOCK_JUMP_NEW_BUY_BLOCKED:'시계 점검으로 신규 매수 보류',
  WARMING_UP:'실시간 자료 준비 중',DAILY_LOSS_PAUSE:'당일 손실 제한 · 신규 진입 중지',
  DAILY_8_ENTRY_LIMIT:'오늘 8회 진입 완료',COIN_DAILY_2_ENTRY_LIMIT:'종목별 2회 제한',COIN_COOLDOWN:'동일 종목 재진입 대기',
  SURGE_ACCOUNT_UNQUALIFIED:'계좌 대사 확인 대기',SURGE_SIGNAL_EXPIRED:'급등 신호 유효시간 경과',
  SURGE_SPREAD:'호가 간격 초과',SURGE_PRICE_ESCAPED:'지정가 상한 초과',SURGE_PAUSED:'신규 매수 일시정지',
  SURGE_SIGNAL_ALREADY_ATTEMPTED:'같은 급등 신호 · 재주문 안 함',SURGE_RESIDUAL_BELOW_MINIMUM:'거래소 최소 매도금액 미달 · 잔량 보존',
  DISABLED:'신규 매수 OFF',EXIT_QUOTE_UNAVAILABLE:'전체 수량 청산 호가 미확인'})[v]||'확인 필요 · '+esc(v||'대기');
}

function sleeve(v,s,qualified){
 const p=v.position,m=strategyMetrics(v,qualified),[num,name,desc]=names[v.id]||['—',esc(v.id),''];
 const qty=n(p?.qty), funds=n(p?.funds), avg=qty>0&&funds!==null?funds/qty:null;
 const isMorning=v.id==='morning',isRandom=v.id==='random',isSurge=v.id==='surge';
 const trial=s.operation_mode==='surge_only_v1'?s.solo_trial:null;
 const limitLabel=trial?.daily_entry_limit===null?'한시적 제한 해제':'8회';
 const streakWaived=trial?.consecutive_loss_limit===null;
 const navWaived=trial?.daily_nav_loss_limit_pct===null;
 const stop=avg===null||isRandom?null:Math.max(avg*((isMorning||isSurge) ? .98 : .94),n(p?.stop_price)??0);
 const peak=n(p?.peak),arm=isRandom ? .10 : .04,gap=isRandom ? .03 : .015;
 const line=avg===null||(p?.armed&&peak===null)?null:avg*(1+(p?.armed?peak-gap:arm));
 const today=s.morning_status;
 const cooldown=isRandom&&timestamp(v.next_entry_at)>Date.now()?Math.ceil((timestamp(v.next_entry_at)-Date.now())/60000):0;
 const surgeDay=Object.values(s.surge_days||{}).at(-1);
 const stateText=isSurge?readableStatus(s.surge_status?.reason):isMorning&&s.morning_live_enabled?readableStatus(today?.reason):'현재 보유 종목 없음';
 return '<article class="sd-card">'+
  '<div class="sd-card-head"><div class="sd-title"><span class="sd-num">'+num+'</span><div><h3>'+name+'</h3><p>'+desc+'</p></div></div>'+
  (p?chip(String(p.market??'').replace(/^KRW-/,'')+' 보유','active'):(isMorning&&!s.morning_live_enabled)||(isSurge&&!s.surge_live_enabled)?chip('신규 매수 OFF'):cooldown?chip(cooldown+'분 후 매수 가능'):chip('현금 대기'))+'</div>'+
  '<div class="sd-result"><span>누적 수익률 <small>순배정액 기준</small></span><strong class="'+tone(m.rate)+'">'+pct(m.rate)+'</strong>'+
  '<p>누적 손익 <b class="'+tone(m.total)+'">'+money(m.total,true)+'</b></p></div>'+
  '<dl class="sd-metrics">'+metric('현재 평가액',money(m.equity))+metric('누적 실현손익',money(m.realized,true),tone(m.realized))+
  metric('보유 평가손익',money(m.unrealized,true),tone(m.unrealized))+metric('보유 현금',money(m.cash))+'</dl>'+
  '<p class="sd-position">'+(p?'보유 '+coin(p.market)+' · 평단 대비 <b class="'+tone(v.return_pct)+'">'+pct(v.return_pct)+'</b>':
    stateText)+'</p>'+
  (isSurge?'<p class="sd-note">'+(s.surge_status?.feed?.warmup_remaining>0?'관측 준비 약 '+Math.ceil(s.surge_status.feed.warmup_remaining/60)+'분 남음 · ':'')+'오늘 전략 수익률 '+pct(s.surge_risk?.return_pct)+'<br>오늘 진입 '+esc(surgeDay?.entries??0)+'회 · '+limitLabel+'<br>연속 손실 '+esc(surgeDay?.losses??0)+(streakWaived?'회 · 차단 한시 해제 (횟수 기록 유지)':' / 3회')+'<br>당일 손실 -5% 차단 '+(navWaived?'한시 해제 (손익 기록 유지)':'유지')+(s.surge_risk?.boundary_gap?'<br>날짜 경계 관측 공백 · 신규 진입 중지':'')+'<br>손절 -2% · 트레일 4% / 1.5%p · 미발동 '+esc((n(s.surge_exit_policy?.unarmed_seconds)??600)/60)+'분 종료</p>'+protectionPanel(p,s):'')+
  '<details class="sd-detail" data-expand-id="sleeve-'+esc(v.id)+'"><summary data-focus-id="detail-'+esc(v.id)+'">운용 상세</summary><dl class="sd-metrics">'+
  metric('순배정액',money(m.netAssigned))+metric('보유 수량',qty===null?'—':number.format(qty))+
  (p?metric('평균 매수가',price(avg))+metric(isSurge?'직전 전량 예상 매도가':'현재 매수호가',price(v.price))+metric('가격 손절선',isRandom?'없음':price(stop))+
    metric(p.armed?'트레일 청산 기준':'트레일 발동 기준',price(line))+metric('포지션 시작',fmt(timestamp(p.opened_at))):'')+
  '</dl><p>'+(isRandom?'가격 손절 없음 · 트레일 10% / 3%p · 유의 지정 시 매도 · 전량 청산 후 10분 휴식':isSurge?'매수 수수료를 제외한 배정 현금 전액 주문. 부분체결 잔액은 현금 유지. 하루 진입 '+limitLabel+' · 종목당 하루 2회. '+(streakWaived?'3연속 손실 차단은 한시 해제. ':'3연속 손실 이후 신규 진입 중지. ')+(navWaived?'당일 -5% 차단도 한시 해제. ':'당일 -5% 차단은 유지. ')+'계좌·데이터 이상 차단은 유지. 손실 상한 보장 아님.':isMorning?'가격 손절 -2% · 트레일 4% / 1.5%p':'가격 손절 -6% · 트레일 4% / 1.5%p')+'</p>'+
  (isMorning&&today?.candidate?'<p>아침 후보 '+coin(today.candidate)+' · '+readableStatus(today.reason)+'</p>':'')+
  (p?.last_exit_reason?'<p>청산 처리 중 · '+esc(exitLabel(p.last_exit_reason))+'</p>':'')+
  '</details><button class="sd-link" data-split-open="'+esc(v.id)+'" data-focus-id="open-'+esc(v.id)+'">이 전략 거래내역 <span aria-hidden="true">→</span></button></article>';
}

export function splitOverview(d){
 const s=d.split_portfolio,eq=n(s.equity_krw),principal=n(d.account?.net_contributions_krw);
 const solo=s.operation_mode==='surge_only_v1',trial=s.solo_trial;
 const stamp=Date.parse(s.updated_at),age=Date.now()-stamp;
 const qualified=s.account_qualified===true&&!s.hold&&eq!==null&&d.source?.service_active!==false&&age>=-5000&&age<180000;
 const profit=qualified&&principal!==null?eq-principal:null,rate=profit!==null&&principal>0?100*profit/principal:null;
 const recent=filledOrders(s).slice(0,5);
 return '<div class="sd"><section class="sd-hero" aria-label="실전 계좌 요약"><div class="sd-hero-head">'+
  '<div><span class="sd-kicker">UPBIT · KRW</span><h2>실전 계좌</h2></div>'+
  '<div class="sd-hero-time">'+chip(qualified?'계좌 대사 완료':'계좌 확인 필요',qualified?'active':'warn')+
  '<span>갱신 <b>'+fmt(stamp,clock)+'</b> KST</span></div></div>'+
  '<dl class="sd-hero-metrics">'+metric('현재 운용자산',money(eq))+metric('누적 수익률',pct(rate),tone(rate))+
  metric('누적 손익',money(profit,true),tone(profit))+'</dl>'+
  '<dl class="sd-hero-meta">'+metric('순투입 원금',money(principal))+metric('공통 예비금',money(s.reserve_krw))+
  metric('대기 주문',n(s.pending_orders)===null?'—':whole.format(n(s.pending_orders))+'건')+'</dl></section>'+
  ((!qualified||s.error)?'<p class="sd-alert" role="status">계좌 또는 주문 상태를 확인 중입니다. 확인되지 않은 손익·수익률은 ‘—’로 표시합니다.</p>':'')+
  (solo?soloPanel(s,qualified):'')+
  '<section class="sd-section">'+heading(solo?'운용 중 · 전략4':'전략별 성과','<span>실전 · 누적 기록 보존</span>')+
  '<div class="sd-grid '+(solo?'sd-solo-grid':'')+'">'+(s.sleeves||[]).filter(v=>!solo||v.id==='surge').map(v=>sleeve(v,s,qualified)).join('')+'</div>'+
  (solo?'<details class="sd-archive" data-expand-id="solo-archive"><summary>중지한 전략 1·2·3 · 과거 기록 보기</summary><p class="sd-note">신규 매수 중지. 청산 손익은 원래 전략에 남고, 현금 이전은 수익에 포함하지 않습니다. 자금 회수 뒤 의미가 달라지는 수익률 대신 실현손익을 표시합니다.</p><ul class="sd-models">'+(s.sleeves||[]).filter(v=>v.id!=='surge').map(v=>'<li><span>'+esc(label(v.id))+'<small> · '+(v.position?'청산 확인 중':'운용 중지')+'</small></span><b class="'+tone(v.realized_krw)+'">'+money(v.realized_krw,true)+'</b><button class="sd-link" data-split-open="'+esc(v.id)+'">기록</button></li>').join('')+'</ul></details>':'')+
  '<details class="sd-detail sd-method" data-expand-id="metric-method"><summary data-focus-id="metric-method">수익률·배정 기준</summary>'+
  '<p>전략 누적 손익 = 누적 실현손익 + 현재 보유 평가손익. 누적 수익률은 이를 순배정액(최초 배정액에 전략 간 재분배 순액을 더한 값)으로 나눕니다. 순배정액이 0원 이하이거나 계좌가 미확인 상태면 수익률을 표시하지 않습니다. 기간 수익률(TWR)은 아닙니다.</p>'+
  '<p>전략 평가손익은 매수 수수료를 포함한 원가와 매수호가 기준이며, 전략4는 전체 수량의 예상 평균 매도가로 평가합니다. 평가손익에서 향후 매도 수수료는 차감하지 않으며, 별도 예상 순수익률에만 가정 수수료를 반영합니다. 계좌 누적 수익률은 계좌 순투입 원금 대비입니다.</p>'+
  '<p>'+(solo?'전략4 단독 운용. 기존 공통 예비금과 별도 보관 잔량은 유지하고, 나머지 운용 현금을 전략4로 합칩니다. 기존 전략4 보유분의 추가 매수는 하지 않으며 다음 신규 진입에 사용합니다. 균등 재분배와 4전략 자동 복귀는 하지 않습니다.':s.version==='split-four-v2'?'네 전략 분할 운용. 코인과 미해결 주문이 없는 전략이 3개 이상이면 해당 전략의 현금만 균등 배분합니다. 보유 전략은 그대로 유지하며 모든 전략이 현금이면 예비금 1%를 제외해 24.75%씩 나눕니다.':'33% / 33% / 33% + 예비금 1%. 세 전략 모두 미보유·미체결일 때 재분배합니다.')+' 재분배 '+esc(s.rebalance_generation??'—')+'회 · 분할 전 별도 보관 자산은 제외합니다.</p></details></section>'+
  '<section class="sd-section">'+heading('최근 실전 체결','<button class="sd-link" data-split-open="ALL">거래내역 보기 →</button>')+
  '<div class="sd-list">'+(recent.length?recent.map(orderRow).join(''):empty('확인된 체결이 아직 없습니다.'))+'</div></section></div>';
}

function soloPanel(s,qualified){
 const t=s.solo_trial||{},ready=t.phase==='ready';
 return '<section class="sd-solo-banner" aria-label="전략4 단독시험"><div class="sd-heading"><h2>전략4 단독시험</h2>'+chip(ready?'실전 운용':'청산·자금 통합 중',ready?'active':'warn')+'</div>'+
 '<dl class="sd-metrics">'+metric('시험 시작 이후 수익률',qualified?pct(t.trial_return_pct):'—',qualified?tone(t.trial_return_pct):'')+
 metric('시험 시작 평가액',money(t.baseline_equity_krw))+metric('시험 시작 KST',fmt(timestamp(t.started_at)))+metric('7일 검토 시점 KST',fmt(timestamp(t.review_at)))+'</dl>'+
 '<p>하루 8회 제한 '+(t.daily_entry_limit===null?'<b>한시 해제</b> · '+fmt(timestamp(t.daily_limit_waiver_until))+' 자동 복구':'<b>적용</b>')+'</p>'+
 '<p>3연속 손실 차단 '+(t.consecutive_loss_limit===null?'<b>한시 해제</b> · '+fmt(timestamp(t.consecutive_loss_waiver?.until))+' 자동 복구 · 손실 횟수는 계속 기록':'<b>적용</b>')+'</p>'+
 '<p>당일 -5% 차단 '+(t.daily_nav_loss_limit_pct===null?'<b>한시 해제</b> · '+fmt(timestamp(t.daily_nav_loss_waiver?.until))+' 자동 복구 · 당일 손익은 계속 기록':'<b>적용</b>')+'</p>'+
 '<p class="sd-note">손절 -2% · 트레일 4% / 1.5%p. 종목당 하루 2회·계좌 및 데이터 이상 차단은 유지합니다. 기존 가상 비교군은 변경하지 않습니다.</p>'+
 (t.review_due?'<p class="sd-alert">7일 검토 시점입니다. 하루 8회 제한은 복구됐습니다. 4전략 복귀는 자동으로 실행하지 않습니다.</p>':'')+
 '<p class="sd-note">시험 수익률은 시작 이후 자금 이동 영향을 제외한 NAV 기준이며, 이전 전략 청산 손익은 포함하지 않습니다.</p></section>';
}

export function surgeResearch(r){
 if(!r||r.paper_only!==true||r.live_orders_enabled!==false)return '';
 const titles={base:'기존 기준 · 10분 / 손절 2 / 트레일 4·1.5',stop15:'손절 1.5%',stop25:'손절 2.5%',arm3:'트레일 3% / 1.5%p',gap2:'트레일 4% / 2%p',timeout10_v1:'10분 · 새 대조군',timeout20_v1:'20분 · 실전 시간 조건',timeout30_v1:'30분 · 연장 후보'};
 const modelRow=m=>'<li><span>'+esc(titles[m.id]||m.id)+'</span><b class="'+tone(m.return_pct)+'">'+(m.qualified?pct(m.return_pct):'판정 제외')+'</b><small>'+esc(m.closed)+'회 청산</small></li>';
 const current=(r.models||[]).filter(m=>m.cohort==='timeout-v1'),legacy=(r.models||[]).filter(m=>m.cohort!=='timeout-v1');
 return '<div class="sd"><section class="sd-section">'+heading('실시간 급등 비교 연구',chip('가상 · 실전과 별도'))+
 '<article class="sd-card"><p class="sd-note">동일한 실시간 입력 · 가상 시작금 100만원씩 · 한 번에 한 변수만 변경</p>'+(r.input_ready===false?'<p class="sd-alert">입력 관측 준비·지연 확인 중 · 비교 수익률 미표시</p>':'')+
 (current.length?'<h3>시간 청산 비교 · 10 / 20 / 30분</h3><p class="sd-note">동시 시작 '+fmt(timestamp(current[0].started_at))+' KST · 동일 자금·매수·손절·트레일 조건. 보유시간 차이로 이후 진입은 달라질 수 있습니다. 가상 하루 8회·3연속 손실·당일 -5% 차단은 유지하므로 현재 실전 한시해제와 다릅니다.</p><ul class="sd-models">'+current.map(modelRow).join('')+'</ul>':'')+
 '<h3>기존 비교군 · 과거 기록 유지</h3><ul class="sd-models">'+legacy.map(modelRow).join('')+
 '</ul><p class="sd-note">진입·청산 최소 1초 지연, 편도 수수료 0.05%, 호가 잔량으로 부분체결 추정. 시세 누락·재시작 중 보유 관측 공백은 기록하고 검증 성과에서 제외합니다. 실제 체결이나 미래 수익을 보장하지 않습니다.</p></article></section></div>';
}

function filledOrders(s){
 return (Array.isArray(s.recent_orders)?s.recent_orders:[]).filter(o=>n(o.qty)>0&&['BUY','SELL'].includes(o.side));
}

function orderRow(o){
 const sell=o.side==='SELL', pnl=n(o.realized_krw),cost=n(o.cost_basis_krw),funds=n(o.funds),q=n(o.qty);
 const rate=sell&&pnl!==null&&cost>0?100*pnl/cost:null;
 const status=!o.terminal?'부분체결 · 처리 중':o.terminal_state==='cancel'?'잔량 취소 · 체결 있음':'주문 종료';
 const context=o.closed_position_context||o.exit_context,audit=context?.exit_audit;
 return '<details class="sd-order" data-expand-id="order-'+esc(o.id)+'"><summary data-focus-id="order-'+esc(o.id)+'"><span class="sd-order-name"><b>'+coin(o.market)+'</b><small>'+fmt(timestamp(o.created_at))+' · '+esc(label(o.owner))+'</small></span>'+
  chip(sell?'매도':'매수',sell?'sell':'buy')+'<span class="sd-order-amount"><b class="'+tone(sell?pnl:null)+'">'+money(sell?pnl:funds,sell)+'</b>'+
  '<small>'+(sell?(rate===null?'순손익':pct(rate)):'체결 금액')+'</small></span><span class="sd-chevron" aria-hidden="true">⌄</span></summary>'+
  '<div class="sd-order-detail"><dl class="sd-metrics">'+metric('평균 체결가',price(funds!==null&&q>0?funds/q:null))+
  metric('체결 수량',number.format(q))+metric('수수료',price(o.fee))+metric('주문 상태',status)+
  (sell?metric('매도 사유',esc(exitLabel(o.exit_reason))):'')+
  (sell&&context?metric('트레일 발동 이력',context.armed?'발동 확인':'발동 미확인')+metric('관측 최고 가격수익률',pct(n(context.peak)===null?null:n(context.peak)*100)):'')+
  (audit?metric('청산 신호 KST',audit.decision_time_known===false?'이전 신호 · 원시각 미확인':fmt(timestamp(audit.decision_at),clock)):'')+'</dl>'+
  '<p>주문 시각 KST · 주문별 누적 체결'+(sell?' · 순손익에 매수·매도 수수료 반영':'')+(o.exit_reason==='OPERATOR_SURGE_ONLY'?' · 전략4 단독 전환 청산':'')+'</p></div></details>';
}

export function splitHistory(d,{owner='ALL',side='ALL',page=0}={}){
 const only=d.split_portfolio?.operation_mode==='repeat_tp_only_week_v1';if(only)owner='repeat_tp';
 const found=filledOrders(d.split_portfolio).filter(o=>(owner==='ALL'||o.owner===owner)&&(side==='ALL'||o.side===side));
 const pages=Math.ceil(found.length/10);
 const current=Math.max(0,Math.min(Math.max(0,pages-1),Number.isFinite(page)?Math.floor(page):0));
 const filter=(values,selected,attr,title)=>'<div class="sd-filters" role="group" aria-label="'+title+'">'+values.map(([key,text])=>
  '<button data-'+attr+'="'+key+'" data-focus-id="'+attr+'-'+key+'" aria-pressed="'+(selected===key)+'">'+text+'</button>').join('')+'</div>';
 return '<div class="sd"><section class="sd-section">'+heading('실전 거래내역','<span>조회 결과 '+found.length+'건</span>')+
  (only?'<p class="sd-note">전략6 · 반복 익절 체결 내역 (시험 전 기록 포함)</p>':filter([['ALL','전체 전략'],...[...Object.keys(names),...(d.split_portfolio?.version==='split-six-v3'?Object.keys(more):[])].map(k=>[k,label(k)])],owner,'split-owner','전략 선택'))+
  filter([['ALL','전체 체결'],['BUY','매수'],['SELL','매도']],side,'split-side','매수·매도 선택')+
  '<div class="sd-list">'+(found.length?found.slice(current*10,current*10+10).map(orderRow).join(''):empty('선택한 조건에 해당하는 체결이 없습니다.'))+'</div>'+
  (pages>1?'<div class="sd-pages"><button data-split-page="'+(current-1)+'" data-focus-id="split-prev" '+(!current?'disabled':'')+'>이전</button><span>'+(current+1)+' / '+pages+'</span><button data-split-page="'+(current+1)+'" data-focus-id="split-next" '+(current+1>=pages?'disabled':'')+'>다음</button></div>':'')+
  '<p class="sd-note">서버가 제공하는 최근 주문 최대 100건 중 실제 체결이 있는 주문만 표시합니다. 이 목록의 건수는 전체 누적 거래 건수가 아닙니다.</p></section></div>';
}

export function morningResearch(r){
 if(!r||r.paper_only!==true||r.live_orders_enabled!==false)return '';
 const models=Array.isArray(r.models)?r.models:[],p=models.find(m=>m.id===r.primary);
 const missing=Array.isArray(r.input_incomplete_days)?r.input_incomplete_days.length:0;
 const days=n(r.elapsed_calendar_days);
 return '<div class="sd"><section class="sd-section">'+heading('아침 전략 비교 연구',chip('가상 계좌'))+
  '<article class="sd-card sd-study"><div><span class="sd-kicker">PAPER · 실전과 별도</span><h3>기준 가상 전략</h3>'+
  '<p>'+esc(r.start_date??'—')+' ~ '+esc(r.end_date??'—')+' · '+esc(r.review??'관측 상태 확인 중')+'</p></div>'+
  '<dl class="sd-metrics">'+metric('가상 수익률',days===0?'—':pct(p?.return_pct),days===0?'':tone(p?.return_pct))+
  metric('완료 거래일',esc(r.primary_completed_trade_days??'—')+' / '+esc(r.minimum_trade_days??25)+'일')+'</dl>'+
  (missing?'<p class="sd-alert">입력 미확인 '+missing+'일 · 수익률 0으로 간주하지 않습니다.</p>':'')+
  '<details class="sd-detail" data-expand-id="paper-models"><summary data-focus-id="paper-models">비교 모델 '+models.length+'개 보기</summary><ul class="sd-models">'+
  models.map(m=>'<li><span>'+esc(m.id)+(m.id===r.primary?' · 기준':'')+'</span><b class="'+(days===0?'':tone(m.return_pct))+'">'+(days===0?'—':pct(m.return_pct))+'</b><small>완료 '+esc(m.closed_trades??'—')+'건</small></li>').join('')+
  '</ul></details><p class="sd-note">가상 시작금 '+money(r.assumptions?.initial_cash)+' · 호가 기반 추정이며 실전 수익에 합산하지 않습니다.</p></article></section></div>';
}
