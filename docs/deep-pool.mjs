// Display authenticated snapshots. This module does not fetch or send orders.
const n = x => typeof x === 'number' && Number.isFinite(x);
const labels = {held:'보유 중',flat:'현금 대기',cooling:'재진입 대기',pending:'주문 확인 중',blocked:'확인 필요'};
const f = (x, digits=0) => x.toLocaleString('ko-KR',{maximumFractionDigits:digits});
const unit = (x, suffix, digits=0) => n(x) ? f(x,digits)+suffix : '—';
const signed = (x, suffix) => !n(x) ? '—' : (x>0?'+':x<0?'−':'')+(suffix==='%'?Math.abs(x).toFixed(2):f(Math.abs(x)))+suffix;
const tone = x => !n(x)||x===0?'neutral':x>0?'up':'down';
const market = s => typeof s==='string'&&/^KRW-[A-Z0-9]{1,24}$/.test(s)?s:null;
const metric = (label,value,style='neutral') => `<div><dt>${label}</dt><dd class="dp-${style}">${value}</dd></div>`;
const sum = (rows,key) => rows?.every(r=>n(r[key]))?rows.reduce((v,r)=>v+r[key],0):null;
const num = x => n(x)?x:typeof x==='string'&&/^\d+(\.\d+)?(?:e[-+]?\d+)?$/i.test(x)?Number(x):null;
const date = x => {
  const t=typeof x==='string' ? Date.parse(x) : NaN;
  if(!Number.isFinite(t))return '시각 미확인';
  const parts = new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(t);
  const get = k => parts.find(p=>p.type===k)?.value;
  return `${get('month')}.${get('day')} ${get('hour')}:${get('minute')}`;
};
function card(x, paused) {
  const key=Object.hasOwn(labels,x.status)?x.status:'unknown', m=market(x.market);
  const label=paused&&key==='flat'?'신규 매수 중지':labels[key]??'상태 미확인';
  const title=m?m.slice(4):key==='pending'?'주문 확인 중':key==='unknown'||key==='held'?'종목 확인 중':'미보유';
  const supporting=m?'KRW 마켓':key==='cooling'?(n(x.cooldown_minutes)?`재진입까지 ${f(x.cooldown_minutes)}분`:'대기 시간 미확인'):key==='blocked'?'계좌 또는 주문 상태 확인 필요':key==='flat'?(paused?'가용 현금 유지':'조건 충족 시 매수'):'';
  return `<article class="dp-slot dp-state-${key}">
    <header class="dp-slot-head"><span class="dp-slot-id">분할 ${String(x.slot).padStart(2,'0')}</span><span class="dp-chip">${label}</span></header>
    <div class="dp-slot-main"><div><h3>${title}</h3><span>${supporting}</span></div>${m?`<strong class="dp-${tone(x.position_pct)}">${signed(x.position_pct,'%')}</strong>`:''}</div>
    <dl class="dp-slot-cash">${metric('원화 잔액',unit(x.cash_krw,'원'))}</dl>
    <dl class="dp-slot-stats">${metric('실현손익',signed(x.realized_krw,'원'),tone(x.realized_krw))}${metric('평가손익',signed(x.unrealized_krw,'원'),tone(x.unrealized_krw))}</dl>
    ${m?`<dl class="dp-slot-trail">${metric('트레일 청산선',unit(x.trail_floor,'원',8))}</dl>`:''}
  </article>`;
}
export function deepOverview(d) {
  const s=d?.deep_pool;
  if(s?.version!=='deep-pool-v1'|| !['paper','live'].includes(s.mode))return null;
  const rows=Array.isArray(s.slots)&&s.slots.length===5&&s.slots.every((x,i)=>x?.slot===i+1)?s.slots:null;
  const realized=sum(rows,'realized_krw'), unrealized=sum(rows,'unrealized_krw');
  const pnl=n(realized)&&n(unrealized)?realized+unrealized:null;
  const ret=n(pnl)&&n(s.initial)&&s.initial>0?pnl/s.initial*100:null;
  const held=rows?.filter(x=>market(x.market)).length;
  return `<div class="dp-view">
    <section class="dp-hero" aria-labelledby="dp-title">
      <header class="dp-hero-head"><div><p class="dp-kicker">업비트 · ${s.mode==='live'?'실계좌':'가상 연구'}</p><h2 id="dp-title">고점 낙폭 5분할</h2></div><span class="dp-hero-tag">KRW 현물</span></header>
      <dl class="dp-hero-result">${metric('누적 수익률',signed(ret,'%'),tone(ret))}${metric('누적 손익',signed(pnl,'원'),tone(pnl))}</dl>
      <dl class="dp-hero-basis">${metric('시작 원금',unit(s.initial,'원'))}${metric('합계 원화 잔액',unit(sum(rows,'cash_krw'),'원'))}</dl>
      <p class="dp-hero-note">분할 운용 원금 기준 · 공통 예비금 제외</p>
    </section>
    <section aria-labelledby="dp-positions"><div class="dp-section-head"><div><p class="dp-eyebrow">운용 현황</p><h2 id="dp-positions">분할별 계좌</h2></div>${rows?`<span class="dp-counter">보유 ${held} / 5</span>`:''}</div>
      ${rows?`<div class="dp-slot-grid">${rows.map(x=>card(x,s.paused===true)).join('')}</div>`:'<p class="dp-empty">5개 분할의 원장 자료를 확인할 수 없습니다.</p>'}
    </section>
    <section class="dp-rule" aria-labelledby="dp-rules"><div class="dp-section-head"><div><p class="dp-eyebrow">전략 기준</p><h2 id="dp-rules">어떻게 운용하나요?</h2></div></div>
      <dl>${metric('진입','180일 고점 대비 50% 이상 하락')}${metric('트레일링','+15% 발동 · 고점 수익률에서 4%p 하락')}${metric('재진입','전량 매도 후 해당 분할만 1시간 대기')}${metric('손절','없음')}</dl>
      <p>트레일 청산선은 매도 판단 기준이며 실제 체결가와 다를 수 있습니다.</p>
    </section>
  </div>`;
}
export function deepHistory(d){
  const arr=d?.deep_pool?.recent;
  const rows=Array.isArray(arr)?arr.slice(0,30).filter(o=>o&&['BUY','SELL'].includes(o.side)):[];
  return `<section class="dp-view dp-history">
    <div class="dp-section-head"><div><p class="dp-eyebrow">실전 5분할</p><h2>최근 주문</h2></div><span class="dp-counter">최대 30건</span></div>
    ${rows.length?`<ul>${rows.map(o=>{
      const qty=num(o.qty),side=o.side==='BUY'?'매수':'매도';
      return `<li><span class="dp-order-side dp-order-${o.side==='BUY'?'buy':'sell'}">${side}</span><div><strong>${market(o.market)??'종목 미확인'}</strong><small>${Number.isInteger(o.slot)&&o.slot>=1&&o.slot<=5?`분할 ${o.slot} · `:''}<span class="dp-order-date">${date(o.at)} KST</span></small></div><div><strong>${qty===0?'체결 없음':unit(qty,'개',8)}</strong><small>수수료 <span class="dp-order-fee">${unit(num(o.fee),'원',8)}</span></small></div></li>`;
    }).join('')}</ul>`:'<div class="dp-empty"><strong>아직 완료된 주문이 없습니다.</strong><p>주문 결과가 원장에 반영되면 여기에 표시됩니다.</p></div>'}
  </section>`;
}
export function deepResearch(){
  return `<section class="dp-view"><div class="dp-section-head"><div><p class="dp-eyebrow">과거 데이터 검증</p><h2>5분할 검증 기록</h2></div><span class="dp-counter">실전과 별도</span></div>
    <div class="dp-research"><p>조건 선택에 사용하지 않은 6개월 · 2026년 5~10월</p><dl>${metric('가상 계좌 수익률 중앙값','−21.74%','down')}${metric('낙폭 제한 없는 비교군','−16.88%','down')}</dl><p>과거 가상 결과는 현재 계좌 수익률이 아닙니다. 손절이 없어 자금이 장기간 묶일 수 있습니다.</p></div>
  </section>`;
}
