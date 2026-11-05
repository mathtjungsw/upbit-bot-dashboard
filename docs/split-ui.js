const names={existing:['01','기존 전략','추세·선별 매매'],random:['02','무작위 트레일링','가격 손절 없음'],morning:['03','아침 전략','09:00 지정가 IOC']};
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
const label=id=>names[id]?.[1]||id;
const heading=(title,hint='')=>'<div class="sd-heading"><h2>'+title+'</h2>'+hint+'</div>';
const chip=(title,t='')=>'<span class="sd-chip '+t+'">'+esc(title)+'</span>';
const metric=(title,value,t='')=>'<div><dt>'+title+'</dt><dd class="'+t+'">'+value+'</dd></div>';
const empty=text=>'<p class="sd-empty">'+text+'</p>';

export function strategyMetrics(v,qualified=true){
 const cash=n(v.cash_krw),equity=n(v.equity_krw),realized=n(v.realized_krw);
 const p=v.position, funds=n(p?.funds), fees=n(p?.entry_fees);
 const cost=p?(funds!==null&&fees!==null&&funds>=0&&fees>=0?funds+fees:null):0;
 const unrealized=p?(equity!==null&&cash!==null&&cost!==null?equity-cash-cost:null):0;
 const netAssigned=cash!==null&&cost!==null&&realized!==null?cash+cost-realized:null;
 const total=qualified&&equity!==null&&realized!==null&&unrealized!==null?realized+unrealized:null;
 return {cash,equity,realized,unrealized:qualified?unrealized:null,netAssigned:qualified?netAssigned:null,
  total,rate:total!==null&&netAssigned>0?100*total/netAssigned:null};
}

function readableStatus(v){
 return ({WAIT_0859_FRAME:'아침 관측 대기',PREPARING:'매수 조건 확인 중',NO_SIGNAL:'조건을 충족한 후보 없음',
  READY:'매수 기회 대기',ORDER_PENDING:'주문 확인 중',HOLDING:'보유 감시 중',EXIT_PENDING:'청산 확인 중',
  EXIT_PENDING_QUOTE:'청산 호가 확인 중',ORDER_TERMINAL:'주문 처리 완료',WINDOW_MISSED:'매수 시간 경과',
  CHECK_OR_ORDER_NOT_CONFIRMED:'매수 조건 또는 주문 확인 필요',CLOCK_JUMP_NEW_BUY_BLOCKED:'시계 점검으로 신규 매수 보류'})[v]||'상태 확인 대기';
}

function sleeve(v,s,qualified){
 const p=v.position,m=strategyMetrics(v,qualified),[num,name,desc]=names[v.id]||['—',esc(v.id),''];
 const qty=n(p?.qty), funds=n(p?.funds), avg=qty>0&&funds!==null?funds/qty:null;
 const isMorning=v.id==='morning',isRandom=v.id==='random';
 const stop=avg===null||isRandom?null:Math.max(avg*(isMorning ? .98 : .94),n(p?.stop_price)??0);
 const peak=n(p?.peak),arm=isRandom ? .10 : .04,gap=isRandom ? .03 : .015;
 const line=avg===null||(p?.armed&&peak===null)?null:avg*(1+(p?.armed?peak-gap:arm));
 const today=s.morning_status;
 return '<article class="sd-card">'+
  '<div class="sd-card-head"><div class="sd-title"><span class="sd-num">'+num+'</span><div><h3>'+name+'</h3><p>'+desc+'</p></div></div>'+
  (p?chip(String(p.market??'').replace(/^KRW-/,'')+' 보유','active'):isMorning&&!s.morning_live_enabled?chip('신규 매수 OFF'):chip('현금 대기'))+'</div>'+
  '<div class="sd-result"><span>누적 수익률 <small>순배정액 기준</small></span><strong class="'+tone(m.rate)+'">'+pct(m.rate)+'</strong>'+
  '<p>누적 손익 <b class="'+tone(m.total)+'">'+money(m.total,true)+'</b></p></div>'+
  '<dl class="sd-metrics">'+metric('현재 평가액',money(m.equity))+metric('누적 실현손익',money(m.realized,true),tone(m.realized))+
  metric('보유 평가손익',money(m.unrealized,true),tone(m.unrealized))+metric('보유 현금',money(m.cash))+'</dl>'+
  '<p class="sd-position">'+(p?'보유 '+coin(p.market)+' · 평단 대비 <b class="'+tone(v.return_pct)+'">'+pct(v.return_pct)+'</b>':
    isMorning&&s.morning_live_enabled?readableStatus(today?.reason):'현재 보유 종목 없음')+'</p>'+
  '<details class="sd-detail" data-expand-id="sleeve-'+esc(v.id)+'"><summary data-focus-id="detail-'+esc(v.id)+'">운용 상세</summary><dl class="sd-metrics">'+
  metric('순배정액',money(m.netAssigned))+metric('보유 수량',qty===null?'—':number.format(qty))+
  (p?metric('평균 매수가',price(avg))+metric('현재 매수호가',price(v.price))+metric('가격 손절선',isRandom?'없음':price(stop))+
    metric(p.armed?'트레일 청산 기준':'트레일 발동 기준',price(line))+metric('포지션 시작',fmt(timestamp(p.opened_at))):'')+
  '</dl><p>'+(isRandom?'트레일 10% / 3%p · 유의 지정 시 예외 매도':isMorning?'가격 손절 -2% · 트레일 4% / 1.5%p':'가격 손절 -6% · 트레일 4% / 1.5%p')+'</p>'+
  (isMorning&&today?.candidate?'<p>아침 후보 '+coin(today.candidate)+' · '+readableStatus(today.reason)+'</p>':'')+
  (p?.last_exit_reason?'<p>청산 처리 중 · '+esc(p.last_exit_reason)+'</p>':'')+
  '</details><button class="sd-link" data-split-open="'+esc(v.id)+'" data-focus-id="open-'+esc(v.id)+'">이 전략 거래내역 <span aria-hidden="true">→</span></button></article>';
}

export function splitOverview(d){
 const s=d.split_portfolio,eq=n(s.equity_krw),principal=n(d.account?.net_contributions_krw);
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
  '<section class="sd-section">'+heading('전략별 성과','<span>실전 · 분할 운용 이후</span>')+
  '<div class="sd-grid">'+(s.sleeves||[]).map(v=>sleeve(v,s,qualified)).join('')+'</div>'+
  '<details class="sd-detail sd-method" data-expand-id="metric-method"><summary data-focus-id="metric-method">수익률·배정 기준</summary>'+
  '<p>전략 누적 손익 = 누적 실현손익 + 현재 보유 평가손익. 누적 수익률은 이를 순배정액(최초 배정액에 전략 간 재분배 순액을 더한 값)으로 나눕니다. 순배정액이 0원 이하이거나 계좌가 미확인 상태면 수익률을 표시하지 않습니다. 기간 수익률(TWR)은 아닙니다.</p>'+
  '<p>전략 평가손익은 매수 수수료를 포함한 원가와 현재 매수호가 기준이며, 앞으로 발생할 매도 수수료는 차감하지 않습니다. 계좌 누적 수익률은 계좌 순투입 원금 대비입니다.</p>'+
  '<p>33% / 33% / 33% + 예비금 1%. 세 전략 모두 미보유·미체결이며 계좌 대사가 완료됐을 때만 재분배합니다. 재분배 '+esc(s.rebalance_generation??'—')+'회 · 분할 전 별도 보관 자산은 제외합니다.</p></details></section>'+
  '<section class="sd-section">'+heading('최근 실전 체결','<button class="sd-link" data-split-open="ALL">거래내역 보기 →</button>')+
  '<div class="sd-list">'+(recent.length?recent.map(orderRow).join(''):empty('확인된 체결이 아직 없습니다.'))+'</div></section></div>';
}

function filledOrders(s){
 return (Array.isArray(s.recent_orders)?s.recent_orders:[]).filter(o=>n(o.qty)>0&&['BUY','SELL'].includes(o.side));
}

function orderRow(o){
 const sell=o.side==='SELL', pnl=n(o.realized_krw),cost=n(o.cost_basis_krw),funds=n(o.funds),q=n(o.qty);
 const rate=sell&&pnl!==null&&cost>0?100*pnl/cost:null;
 const status=!o.terminal?'부분체결 · 처리 중':o.terminal_state==='cancel'?'잔량 취소 · 체결 있음':'주문 종료';
 return '<details class="sd-order" data-expand-id="order-'+esc(o.id)+'"><summary data-focus-id="order-'+esc(o.id)+'"><span class="sd-order-name"><b>'+coin(o.market)+'</b><small>'+fmt(timestamp(o.created_at))+' · '+esc(label(o.owner))+'</small></span>'+
  chip(sell?'매도':'매수',sell?'sell':'buy')+'<span class="sd-order-amount"><b class="'+tone(sell?pnl:null)+'">'+money(sell?pnl:funds,sell)+'</b>'+
  '<small>'+(sell?(rate===null?'순손익':pct(rate)):'체결 금액')+'</small></span><span class="sd-chevron" aria-hidden="true">⌄</span></summary>'+
  '<div class="sd-order-detail"><dl class="sd-metrics">'+metric('평균 체결가',price(funds!==null&&q>0?funds/q:null))+
  metric('체결 수량',number.format(q))+metric('수수료',price(o.fee))+metric('주문 상태',status)+'</dl>'+
  '<p>주문 시각 KST · 주문별 누적 체결'+(sell?' · 순손익에 매수·매도 수수료 반영':'')+'</p></div></details>';
}

export function splitHistory(d,{owner='ALL',side='ALL',page=0}={}){
 const found=filledOrders(d.split_portfolio).filter(o=>(owner==='ALL'||o.owner===owner)&&(side==='ALL'||o.side===side));
 const pages=Math.ceil(found.length/10);
 const current=Math.max(0,Math.min(Math.max(0,pages-1),Number.isFinite(page)?Math.floor(page):0));
 const filter=(values,selected,attr,title)=>'<div class="sd-filters" role="group" aria-label="'+title+'">'+values.map(([key,text])=>
  '<button data-'+attr+'="'+key+'" data-focus-id="'+attr+'-'+key+'" aria-pressed="'+(selected===key)+'">'+text+'</button>').join('')+'</div>';
 return '<div class="sd"><section class="sd-section">'+heading('실전 거래내역','<span>조회 결과 '+found.length+'건</span>')+
  filter([['ALL','전체 전략'],...Object.keys(names).map(k=>[k,label(k)])],owner,'split-owner','전략 선택')+
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
