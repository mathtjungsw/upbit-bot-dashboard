// Pure renderers for the authenticated snapshot. This module does not fetch, store or trade.
export const owners=['existing','random','morning','surge','daily_tp','repeat_tp'];
const titles=['스윙','랜덤 트레일링','오전 9시','급등 추세','하루 첫 익절','반복 익절'];
const policies=['이격·거래대금 선별 / −6% 보호','+10% 발동 / 3%p 트레일','08:59 동결 / 09:00 진입','−2% 보호 / 4%·1.5%p 트레일','비용 후 +1% 지정가 / 성공일 종료','비용 후 +1% 지정가 / 다음 신호 재진입'];
const roles=['base','primary','explore'];
const roleName={base:'기준',primary:'주 비교',explore:'탐색'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>(typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isFinite(Number(v))?Number(v):null;
const fmt=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:8});
const whole=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0});
const df=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const cf=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
const ms=v=>num(v)!==null?num(v)*1000:typeof v==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(v)?Date.parse(v):NaN;
const date=(v,clock=false)=>{const t=ms(v);return Number.isFinite(t)&&Math.abs(t)<=8.64e15?(clock?cf:df).format(t):'—';};
const qty=v=>num(v)===null?'—':fmt.format(num(v));
const krw=(v,signed=false)=>num(v)===null?'—':(signed&&num(v)>0?'+':'')+whole.format(num(v))+'원';
const px=v=>num(v)!==null&&num(v)>0?qty(v)+'원':'—';
const pct=(v,unit='%')=>num(v)===null?'—':(num(v)>0?'+':'')+num(v).toFixed(2)+unit;
const count=(v,u='건')=>Number.isInteger(num(v))&&num(v)>=0?num(v)+u:'—';
const tone=v=>num(v)>0?'up':num(v)<0?'down':'';
const arr=v=>Array.isArray(v)?v:[];
const ttl=id=>titles[owners.indexOf(id)]??'전략 미확인';
const metric=(key,value,col='')=>'<div><dt>'+esc(key)+'</dt><dd class="'+col+'">'+esc(value)+'</dd></div>';
const chip=(s,kind='')=>'<span class="s6-chip '+kind+'">'+esc(s)+'</span>';
const sectionHead=(small,title,side='')=>'<header class="s6-head"><div><p class="s6-kicker">'+esc(small)+'</p><h2>'+esc(title)+'</h2></div>'+side+'</header>';
const pending=msg=>'<p class="s6-note" role="status">'+esc(msg)+'</p>';
const reasonMap={SURGE_STOP:'가격 손절',SURGE_STOP_THIN_BOOK:'얕은 호가 · 손절',SURGE_TRAIL:'트레일링',SURGE_TRAIL_THIN_BOOK:'얕은 호가 · 트레일링',SURGE_UNARMED_20M:'20분 시간 청산',SURGE_WARNING:'유의 지정',STOP_FIXED_6:'−6% 손절',TRAIL_4_1_5:'트레일링',TRAIL_10_3:'트레일링',MARKET_WARNING_EXIT:'유의 지정',NET_TP:'순익 목표 익절',FIXED_NET_TP:'순익 목표 익절',NO_SIGNAL:'유효 신호 대기',WARMING_UP:'관측 준비 중',DAILY_8_ENTRY_LIMIT:'하루 8회 제한',DAILY_LOSS_PAUSE:'일일 손실 제한',COIN_DAILY_2_ENTRY_LIMIT:'종목당 2회 제한',COIN_COOLDOWN:'재진입 대기',SURGE_SIGNAL_ALREADY_ATTEMPTED:'같은 신호 재진입 금지',INPUT_INCOMPLETE:'관측 누락',INSUFFICIENT_SAMPLE:'표본 부족',WARMUP:'관측 준비',ELIGIBLE:'분석 가능'};
Object.assign(reasonMap,{NET_TARGET:'순익 지정가 익절',FIXED_STOP_2:'−2% 가격 손절',FIXED_WARNING:'유의 지정 청산'});
const why=v=>typeof v==='string'&&v.length?(Object.hasOwn(reasonMap,v)?reasonMap[v]:v):'—';
export const isSix=d=>d?.split_portfolio?.version==='split-six-v3'&&d.split_portfolio.live===true;
function freshness(v,now,limit){const age=now-ms(v);return Number.isFinite(age)&&age>=-5000&&age<limit;}
const weekMode='repeat_tp_only_week_v1', weekMs=7*86400000;
export function weekClock(s,now){
 const t=s.repeat_trial,normal=s.operation_mode==='six_equal_v1';
 if(normal&&t?.phase==='restored')return {label:'시험 종료',note:'서버 원장에 6전략 복귀가 기록됐습니다.'};
 if(normal&&(!t||t.phase==='pending'))return {label:'전환 대기',note:'전략6에 운용금이 모인 시각부터 7일을 셉니다.'};
 if(s.operation_mode===weekMode&&t?.phase==='drain'&&t.history_epoch===s.research_epoch&&s.research_epoch)
   return {label:'전환 중',note:'기존 보유·주문 정리 중입니다. 아직 7일을 세지 않습니다.'};
 const start=t?.started_at,end=t?.expires_at;
 if(s.operation_mode!==weekMode||t?.phase!=='running'||typeof s.research_epoch!=='string'||!s.research_epoch||t.history_epoch!==s.research_epoch||
    ![start,end].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>0)||Math.abs((end-start)*1000-weekMs)>.01||
    !(ms(s.updated_at)>=start*1000-1)||!(now>=start*1000)||!Number.isFinite(now)||end*1000>8.64e15)
   return {label:'시각 확인 중',note:'서버가 확인한 시작·마감 시각이 있어야 남은 시간을 표시합니다.'};
 const sec=Math.max(0,Math.ceil((end*1000-now)/1000)),days=Math.floor(sec/86400),two=v=>String(v).padStart(2,'0');
 return {label:sec?days+'일 '+two(Math.floor(sec/3600)%24)+':'+two(Math.floor(sec/60)%60)+':'+two(sec%60):'결정 대기',
   note:'시작 '+date(start)+' → 마감 '+date(end)+' KST',timed:true};
}
export function updateWeekClock(root,s,now=Date.now()){
 const el=root.querySelector('[data-week-clock]');if(!el||!s)return;
 const clock=weekClock(s,now),out=el.querySelector('strong'),foot=el.querySelector('small');
 const note=clock.note+(!freshness(s.updated_at,now,180000)?' · 서버 갱신 지연 (마지막 기록 기준)':'');
 if(out.textContent!==clock.label)out.textContent=clock.label;
 if(foot.textContent!==note)foot.textContent=note;
}
function weekBanner(s,now){
 const c=weekClock(s,now);
 return '<div class="s6-week" data-week-clock><span>전략6 단독 시험 · 7일까지</span><strong role="timer" aria-live="off">'+esc(c.label)+'</strong><small>'+esc(c.note)+(!freshness(s.updated_at,now,180000)?' · 서버 갱신 지연 (마지막 기록 기준)':'')+'</small></div>';
}
function orderView(o,now,fresh) {
 if(!o)return {label:'주문 확인 자료 없음',detail:'지정가 미제출·미확인 구분 필요',confirmed:false};
 if(o.state==='cancel_pending')return {label:'취소 확인 중',detail:'거래소의 최종 취소·체결 결과 대기',confirmed:false};
 if(o.state==='submitted')return {label:'제출 후 거래소 확인 대기',detail:'접수와 대기 상태를 구분합니다.',confirmed:false};
 if(o.state==='unknown'||!o.uuid)return {label:'거래소 주문 상태 미확인',detail:'최근 조회 결과를 확인할 수 없습니다.',confirmed:false};
 if(!['wait','watch','partial'].includes(o.state))return {label:'현재 대기 주문 미확인',detail:'이 기록은 현재 대기 상태가 아닙니다.',confirmed:false};
 if(!fresh||!freshness(o.verified_at,now,15000))return {label:'거래소 주문 재확인 필요',detail:'대기 주문 조회 지연 · 과거 가격을 현재 걸린 가격으로 표시하지 않습니다.',confirmed:false};
 return {label:o.state==='partial'?'부분 익절 · 잔량 대기':'익절 지정가 대기',detail:'',confirmed:true};
}
function orderMetrics(o,view,acctOK) {
 if(!view.confirmed)return metric('거래소 매도 주문',view.detail);
 const q=num(o.qty),filled=num(o.executed_qty),left=num(o.remaining_qty);
 const valid=q>0&&filled!==null&&filled>=0&&left!==null&&left>=0&&Math.abs(filled+left-q)<=Math.max(1e-12,1e-12*q);
 return metric(acctOK?'거래소에 걸린 매도가':'거래소 확인 매도가 · 계좌 대사 중',px(o.price))+metric('체결 / 잔량',valid?(100*filled/q).toFixed(1)+'% / '+qty(left)+'개':'수량 확인 중')+metric('거래소 주문 확인 KST',date(o.verified_at,true));
}
function quoteKnown(v,id,now){
 if(!v?.position)return true;
 if(!(num(v.price)>0))return false;
 return !['daily_tp','repeat_tp'].includes(id)||freshness(v.price_observed_at,now,15000);
}
function closedFor(s,id){
 const rows=new Map();
 for(const o of arr(s.recent_orders)){
  const net=num(o?.cycle_net_krw),base=num(o?.cycle_cost_krw);
  if(o?.owner!==id||o.side!=='SELL'||o.terminal!==true||net===null||!Number.isFinite(ms(o.terminal_at))||typeof o.market!=='string')continue;
  const x={market:o.market,closed_at:o.terminal_at,net_krw:net,return_pct:base>0?100*net/base:null,reason:o.exit_reason};
  rows.set(x.market+'|'+ms(x.closed_at),x);
 }
 for(const x of arr(s.recent_closed))if(x?.owner===id&&typeof x.market==='string'&&Number.isFinite(ms(x.closed_at)))rows.set(x.market+'|'+ms(x.closed_at),x);
 return [...rows.values()].sort((a,b)=>ms(b.closed_at)-ms(a.closed_at)).slice(0,3);
}
function sleeve(v,id,s,ok,now,fresh) {
 const idx=owners.indexOf(id);
 if(!v)return '<article class="s6-card"><h3>'+String(idx+1).padStart(2,'0')+' · '+ttl(id)+'</h3>'+pending('전략 원장 미수신')+'</article>';
 const p=v.position,mval=num(v.equity_krw),cash=num(v.cash_krw),fund=num(p?.funds),fee=num(p?.entry_fees);
 const priceOK=quoteKnown(v,id,now);
 const unreal=!ok||!priceOK?null:p?mval!==null&&cash!==null&&fund!==null&&fee!==null?mval-cash-fund-fee:null:v.position===null?0:null;
 const duration=Math.floor((now-ms(p?.opened_at))/60000);
 const held=Number.isFinite(duration)&&duration>=0?Math.floor(duration/60)+'시간 '+duration%60+'분':'—';
 const fixed=id==='daily_tp'||id==='repeat_tp',view=fixed?orderView(v.target_order,now,fresh):null;
 const st=fixed&&p&&v.target_order?view.label:v.state_label||(p?'보유 중':v.entry_suspended?'신규 진입 중지':v.position===null?'현금 대기':'미확인');
 const err=typeof v.protection_error==='string'&&v.protection_error.trim().length>0;
 const dayKey=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(now);
 const ctr=s.surge_days?.[dayKey];
 const valued=ok&&priceOK&&('position' in v),capital=num(v.capital_krw),total=valued?num(v.total_pnl_krw):null;
 const allRate=valued&&capital>0?num(v.total_return_pct):null;
 const q=num(p?.qty),avg=fund>0&&q>0?fund/q:null;
 const price=valued&&p?num(v.price):null;
 const heldRate=price>0?num(v.return_pct)??(avg>0?100*(price/avg-1):null):null;
 const n=num(v.closed_trades),w=num(v.winning_trades),scored=Number.isInteger(n)&&n>=0&&Number.isInteger(w)&&w>=0&&w<=n;
 const validPeriods=valued&&freshness(v.live_periods?.as_of,now,150000)?v.live_periods:{};
 const arm=id==='random'?0.10:0.04,gap=id==='random'?0.03:0.015,peak=num(p?.peak);
 const stop=avg===null?null:id==='existing'?Math.max(avg*.94,num(p?.stop_price)??0):id==='random'?null:avg*.98;
 const recentRows=closedFor(s,id);
 const returns='<dl class="s6-returns">'+metric('전략 누적 수익률',pct(allRate),tone(allRate))+metric('보유 코인 등락률',p?pct(heldRate):v.position===null?'미보유':'—',tone(heldRate))+'</dl>';
 const some=(label,value)=>metric(label,pct(value),tone(value));
 const detail='<details class="s6-details" data-expand-id="s6-'+id+'"><summary data-focus-id="s6-detail-'+id+'">수익률·보유·거래 상세</summary><div class="s6-detail-body">'+
 '<h4>기간별 수익률</h4><dl>'+some('오늘 00시부터',validPeriods.today)+some('최근 7일',validPeriods.week)+some('최근 14일',valued?v.return_14d_pct:null)+some('6전략 전환 후',validPeriods.since)+'</dl>'+
 '<p class="s6-return-caption">전략 누적은 이전 실적을 포함한 순배정액 대비 손익입니다. 기간 수익률은 자금 재배분을 제외합니다. 시작 시점 자료가 없으면 — 로 표시합니다.</p>'+
 (p?'<h4>'+esc(p.market??'보유 종목')+' · 보유 상세</h4><dl>'+metric('평균 매수가',px(avg))+metric('현재 평가가',px(price))+metric('보유 수량',q>0?qty(q)+'개':'—')+metric('잔량 매입원가 · 매수비용 포함',krw(fund!==null&&fee!==null?fund+fee:null))+metric('보유 시작 KST',date(p.opened_at))+metric('보유 경과',held)+
 (id==='random'?metric('가격 손절','없음 · 유의 지정 예외'):metric('가격 손절 기준',px(stop)))+
 (fixed?'':metric('트레일 발동 기준',px(avg>0?avg*(1+arm):null))+metric('트레일 상태',p.armed===true?'발동':p.armed===false?'발동 대기':'—')+metric('추적 고점 등락률',pct(peak===null?null:peak*100))+metric('현재 트레일 청산 기준',p.armed===true?px(avg>0&&peak!==null?avg*(1+peak-gap):null):p.armed===false?'아직 미발동':'—'))+'</dl>'+
 '<p class="s6-return-caption">코인 등락률은 평균 매수가 대비이며 수수료 차감 전입니다. 평가가·보호 기준은 체결가가 아닙니다. 보유시간만으로 매도하지 않습니다.</p>':'')+
 '<h4>실제 거래 성적</h4><dl>'+metric('전량 청산',count(n))+metric('수익 청산',scored?count(w):'—')+metric('승률',scored&&n>0?(100*w/n).toFixed(1)+'%':n===0?'청산 전':'—')+'</dl>'+
 (recentRows.length?'<p class="s6-return-caption">최근 확인된 청산 · 최대 3건</p><ul class="s6-recentmini">'+recentRows.map(t=>'<li><span>'+esc(t.market)+' · '+date(t.closed_at)+'</span><strong class="'+tone(t.return_pct)+'">'+pct(t.return_pct)+'</strong><small>'+krw(t.net_krw,true)+' · '+esc(why(t.reason))+'</small></li>').join('')+'</ul>':pending('최근 수신 내역에서 이 전략의 전량 청산 기록이 확인되지 않았습니다.'))+
 '</div></details>';
 return '<article class="s6-card"><header><div class="s6-name"><span class="s6-num">0'+(idx+1)+'</span><div><h3>'+ttl(id)+'</h3><p>'+policies[idx]+'</p></div></div>'+chip(st,p?'on':'')+'</header>'+
 (err?'<p role="alert" class="s6-alert"><b>보호 주문 확인 필요</b> · '+esc(v.protection_error.slice(0,160))+'</p>':'')+
 returns+'<dl class="s6-kpis">'+metric('현재 전략 자산',krw(valued?mval:null))+metric('누적 총손익',krw(total,true),tone(total))+metric('순배정액',krw(v.capital_krw))+metric('가용 원화',krw(ok?(v.available_cash_krw??(s.pending_orders===0?v.cash_krw:null)):null))+
 metric('누적 실현손익',krw(v.realized_krw,true),tone(v.realized_krw))+metric('평가손익',krw(unreal,true),tone(unreal))+
 metric('보유 종목',p?p.market??'—':v.position===null?'없음':'—')+metric('6전략 전환 후',pct(validPeriods.since),tone(validPeriods.since))+'</dl>'+
 (id==='surge'?'<div class="s6-callout"><b>신규 진입 제한</b><p>오늘 '+count(ctr?.entries,'회')+' / 8회 · 연속 손실 '+count(ctr?.losses,'회')+' / 3회 · 당일 NAV '+pct(s.surge_risk?.day===dayKey?s.surge_risk?.return_pct:null)+' / −5%</p><p>최근 판정: '+esc(why(v.entry_reason??s.surge_status?.reason))+'</p></div>':'')+
 (fixed&&p?'<div class="s6-callout"><b>익절 주문 추적</b><dl class="s6-kpis">'+orderMetrics(v.target_order,view,ok)+metric('현재 예상 순수익률',pct(ok&&priceOK?v.net_position_return_pct:null))+metric('보유 경과',held)+'</dl>'+(!fresh||!priceOK?'<p>평가 호가 미확인 · 마지막 주문 조회와 현재 평가 호가는 별개입니다.</p>':'')+'<p>시간 청산 없음 · 손절·유의 지정 시 잔량 보호</p></div>':'')+
 detail+'</article>';
}
function recent(s){
 const rows=Array.isArray(s.recent_closed)?s.recent_closed.filter(x=>x&&owners.includes(x.owner)&&typeof x.market==='string').slice().sort((a,b)=>ms(b.closed_at)-ms(a.closed_at)).slice(0,5):null;
 return sectionHead('체결 완료 기준','최근 청산 5건','<button class="s6-action" data-tab="trades">전체 내역</button>')+
 (!rows?pending('전체 포지션의 청산 자료 미수신 · 일부 매도 주문을 청산 완료로 대신 표시하지 않습니다.'):!rows.length?pending('확인된 청산 없음'):
 '<ul class="s6-list">'+rows.map(t=>'<li><div><b>'+esc(t.market.replace(/^KRW-/,''))+'</b><small>'+esc(ttl(t.owner))+' · '+date(t.closed_at)+' KST</small></div><div><b class="'+tone(t.return_pct)+'">'+pct(t.return_pct)+'</b><small>'+esc(why(t.reason))+'</small></div></li>').join('')+'</ul>');
}
export function sixOverview(d,now=Date.now()) {
 if(!isSix(d))return '';
 const s=d.split_portfolio,a=s.account_summary||{},rows=arr(s.sleeves),fresh=freshness(s.updated_at,now,180000);
 const ok=fresh&&s.account_qualified===true&&!s.hold&&d.source?.service_active===true;
 const eq=num(s.equity_krw),principal=num(a.net_contributions_krw??d.account?.net_contributions_krw);
 const indexed=Object.fromEntries(owners.map(id=>{const hits=rows.filter(r=>r?.id===id);return [id,hits.length===1?hits[0]:null]}));
 const holdings=ok&&owners.every(id=>indexed[id]&&('position' in indexed[id]))?rows.filter(r=>owners.includes(r.id)&&r.position).length:null;
 const faults=owners.filter(id=>typeof indexed[id]?.protection_error==='string'&&indexed[id].protection_error.trim());
 const missingPrices=owners.filter(id=>!quoteKnown(indexed[id],id,now));
 const valued=ok&&!missingPrices.length&&owners.every(id=>indexed[id]&&('position' in indexed[id]));
 const total=valued&&eq!==null&&principal!==null?eq-principal:null,rate=total!==null&&principal>0?100*total/principal:null;
 const alloc=arr(s.recent_allocations).at(-1);
 if(s.operation_mode===weekMode){
  const v=indexed.repeat_tp,w=s.week_performance||{},good=ok&&!!v&&quoteKnown(v,'repeat_tp',now);
  const n=num(w.closed),wins=num(w.wins),win=n>0&&wins!==null&&wins>=0&&wins<=n?(wins/n*100).toFixed(1)+'%':n===0?'첫 청산 전':'—';
  const card=sleeve(v,'repeat_tp',s,ok,now,fresh);
  const sig=s.surge_status||{},warm=num(sig.feed?.warmup_remaining);
  const signal=(!fresh?'마지막 관측 · ':'')+(sig.reason==='WARMING_UP'&&warm!==null&&warm>0?'관측 준비 · 약 '+Math.ceil(warm/60)+'분 남음':why(sig.reason));
  return '<div class="s6"><section class="s6-hero">'+sectionHead('실전 · 7일 단독 운용','전략6 · 반복 익절',chip(ok?'계좌 확인':'계좌 확인 대기',ok?'on':'warn'))+weekBanner(s,now)+
    '<p class="s6-stamp">계좌 확인 <b>'+date(s.updated_at,true)+'</b> KST</p><dl class="s6-returns">'+metric('시험 시작 후 수익률',pct(good?w.return_pct:null),tone(good?w.return_pct:null))+metric('시험 총손익 · 평가 포함',krw(good?w.net_krw:null,true),tone(good?w.net_krw:null))+'</dl>'+
    '<dl class="s6-kpis">'+metric('시작 운용금',krw(w.initial_krw))+metric('현재 전략6 자산',krw(good?v.equity_krw:null))+metric('시험 실현손익',krw(w.realized_krw,true),tone(w.realized_krw))+metric('시험 청산 / 승률',count(w.closed)+' · '+win)+metric('공통 예비금 · 매매 제외',krw(s.reserve_krw))+'</dl></section>'+
    pending('매수 신호: '+signal+' · 준비가 끝나도 조건을 충족해야 주문합니다.')+
    (!ok?pending('계좌 대사 또는 갱신 지연 · 현재 평가값은 표시하지 않습니다.'):'')+
    '<section>'+sectionHead('실거래 · 기존 누적과 시험 실적 구분','보유·주문 상세')+card+'</section><section>'+
    recent({...s,recent_closed:s.repeat_recent_closed})+'</section></div>';
 }
 return '<div class="s6"><section class="s6-hero">'+sectionHead('실전 계좌 · 원화',s.operation_mode===weekMode?'전략6 단독 시험':'여섯 전략 운용',chip(ok?'대사 완료':fresh?'대사 확인 중':'갱신 지연',ok?'on':'warn'))+weekBanner(s,now)+
 '<p class="s6-stamp">마지막 갱신 <b>'+date(s.updated_at,true)+'</b> KST</p><div class="s6-balance"><small>전체 운용자산</small><strong>'+krw(valued?eq:null)+'</strong></div>'+
 '<dl class="s6-kpis">'+metric('순투입 원금',krw(principal))+metric('누적 순손익',krw(total,true),tone(total))+metric('원금 대비 누적',pct(rate),tone(rate))+metric('6전략 전환 후',pct(valued?a.since_transition_pct:null))+
 metric('오늘 00시부터',pct(valued?a.today_pct:null))+metric('최근 14일 TWR',pct(valued?a.return_14d_pct:null))+'</dl></section>'+
 (faults.length?'<div role="alert" class="s6-alert"><b>보호 주문 점검 필요</b><p>'+esc(faults.map(ttl).join(' · '))+' — 전략 카드에서 실패 사유를 확인하세요.</p></div>':'')+
 (!ok?pending(!fresh?'계좌 스냅샷 갱신 지연 · 현재 자산과 수익률을 보류합니다.':'계좌 대사 미확인 · 현재 자산과 수익률을 보류합니다.'):'')+
 (fresh&&missingPrices.length?pending('보유 평가 호가 미확인: '+missingPrices.map(ttl).join(' · ')+' · 이 전략의 평가 수익률을 보류합니다.'):'')+
 '<section>'+sectionHead('운용 원화','배분 현황')+'<dl class="s6-kpis">'+metric('코인 보유',count(holdings,'개 전략'))+metric('재배분 가능',s.operation_mode===weekMode?'균등 배분 중지':count(ok?s.rebalance_eligible_count:null,'개 전략'))+metric('공통 예비금',krw(s.reserve_krw))+metric('최근 재배분 KST',date(alloc?.at))+'</dl><p class="s6-note">'+(s.operation_mode===weekMode?'단독 시험 중에는 6분할로 자동 복귀하지 않습니다.':'미보유 전략이 4개 이상일 때 해당 전략의 가용 원화만 균등 배분합니다.')+'</p></section>'+
 '<section>'+sectionHead('실제 매수·매도','전략별 계좌')+'<div class="s6-grid">'+owners.map(id=>sleeve(indexed[id],id,s,ok,now,fresh)).join('')+'</div></section>'+
 '<section>'+recent(s)+'</section></div>';
}
export function sixResearch(d,now=Date.now()){
 if(!isSix(d))return '';
 const s=d.split_portfolio,r=d.six_research??s.six_research;
 if(s.operation_mode===weekMode){
  const head=sectionHead('실계좌와 별도 집계','전략6 가상 비교',chip('연구 전용'));
  function block(x,stress){
   if(!x||x.scope!=='s6_only'||x.epoch!=='s6-week-'+s.research_epoch||x.paper_only!==true||x.live_orders_enabled!==false||
      x.diagnostics?.stress!==stress)return pending('전략6 전용 자료 대기');
   return '<p class="s6-note">'+(stress?'체결 지연·비용을 높인 모의 체결':'기본 비용·호가와 공개 체결 기반 추정')+' · '+date(x.updated_at,true)+' KST'+(!freshness(x.updated_at,now,120000)?' · 갱신 지연':'')+'</p><ul class="s6-list">'+roles.map(role=>{
    const matches=arr(x.models).filter(m=>m.strategy===6&&m.role===role);const m=matches.length===1?matches[0]:{};
    return '<li><div><b>'+esc(m.label||roleName[role])+'</b><small>청산 '+count(m.trades)+' · 보유 '+count(m.open_positions)+'</small></div><div><b>'+pct(m.return_pct)+'</b><small>실현 '+krw(m.realized_krw,true)+'</small></div></li>';
   }).join('')+'</ul>';
  }
  return '<div class="s6"><section>'+head+block(r,false)+'</section><section>'+sectionHead('같은 세 조건','비용 스트레스')+block(d.s6_week_stress,true)+'</section></div>';
 }
 const ok=r?.version==='six-forward-v1'&&typeof s.research_epoch==='string'&&s.research_epoch.length>0&&r.epoch===s.research_epoch&&r.paper_only===true&&r.live_orders_enabled===false;
 const head=sectionHead('실전과 별도로 집계','가상 연구 · 14일 리뷰',chip('가상 전용'));
 if(!ok)return '<div class="s6"><section>'+head+pending('새 연구 세대의 입력 대기 · 이전 가상 성과를 대신 표시하지 않습니다.')+'</section></div>';
 const c=r.cycle||{},q=r.quality||{},delta=ms(c.end_at)-now;
 const left=Number.isFinite(delta)?delta>0?Math.ceil(delta/86400000)+'일 남음':'평가시점 도달':'—';
 const models=arr(r.models),stale=!freshness(r.updated_at,now,300000);
 return '<div class="s6"><section>'+head+
 (stale?pending('가상 요약 갱신 지연 · 아래 기록은 마지막 관측 시점 기준입니다.'):'')+
 '<dl class="s6-kpis">'+metric('평가 주기',count(c.number,'회차'))+metric('다음 점검',left)+metric('시작 KST',date(c.start_at))+metric('종료 KST (미포함)',date(c.end_at))+metric('유효 관측률',num(q.coverage_pct)===null?'—':num(q.coverage_pct).toFixed(1)+'%')+metric('자료 상태',why(q.state))+'</dl>'+
 (arr(q.issues).length?pending(q.issues.slice(0,6).map(why).join(' · ')):'')+pending('수익률은 가상 운용 결과입니다. 표본이 부족하거나 원천이 누락된 경우 실전 채택 근거로 보지 않습니다.')+'</section><section>'+sectionHead('한 번에 한 변수','전략별 비교')+
 owners.map((id,i)=>'<article class="s6-card"><h3>0'+(i+1)+' · '+ttl(id)+'</h3><ul class="s6-list">'+roles.map(role=>{
 const hits=models.filter(m=>m&&m.strategy===i+1&&m.role===role),m=hits.length===1?hits[0]:null;
 if(!m)return '<li><span>'+roleName[role]+'</span><small>미수신</small></li>';
 return '<li><div><b>'+roleName[role]+' · '+esc(m.label||'설정 미수신')+'</b><small>청산 '+count(m.trades)+' · 보유 '+count(m.open_positions,'건')+'</small></div><div><b>'+pct(m.return_pct)+'</b><small>'+(!m.qualified?'판정 보류 · '+esc(why(m.reason)):role==='base'?'기준':'기준 대비 '+pct(m.delta_pp,'%p'))+'</small></div></li>';
 }).join('')+'</ul></article>').join('')+'</section><section>'+sectionHead('고정 구간 · 자동 실전 변경 없음','완료된 14일 평가')+
 (arr(r.reviews).length?'<ul class="s6-list">'+arr(r.reviews).filter(v=>v&&typeof v==='object').slice(-6).reverse().map(v=>'<li><div><b>'+count(v.number??v.cycle?.number,'회차')+'</b><small>'+date(v.cycle?.end_at??v.end_at)+' KST</small></div><div>'+esc(v.state==='REVIEW_ONLY_NO_AUTO_ADOPTION'?'검토 전용 · 자동 변경 없음':why(v.decision??v.state))+'<small>유효 관측 '+(num(v.coverage_pct)===null?'—':num(v.coverage_pct).toFixed(1)+'%')+'</small></div></li>').join('')+'</ul>':pending('아직 완료된 14일 평가가 없습니다.'))+'</section></div>';
}
