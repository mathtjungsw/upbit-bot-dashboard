// Authenticated snapshot only. Never place or cancel orders from this view.
const n = x => typeof x === 'number' && Number.isFinite(x);
const fmt = (x, suffix, digits=0) => n(x) ? x.toLocaleString('ko-KR',{maximumFractionDigits:digits})+suffix : '미확인';
const row = (key,value) => '<dt>'+key+'</dt><dd>'+value+'</dd>';
const symbol = s => typeof s === 'string' && /^KRW-[A-Z0-9]{1,24}$/.test(s) ? s : '미확인';
const labels = {held:'보유',flat:'현금',cooling:'매도 후 대기',pending:'주문 확인 중',blocked:'신규 매수 차단'};
export function deepOverview(d) {
  const s=d?.deep_pool;
  if(s?.version!=='deep-pool-v1'|| !['paper','live'].includes(s.mode))return null;
  const title=s.mode==='live'?'실제 계좌':'가상 연구';
  const slots=s.slots;
  const valid=Array.isArray(slots)&&slots.length===5&&slots.every((x,i)=>x?.slot===i+1);
  const pnl=valid&&slots.every(x=>n(x.realized_krw)&&n(x.unrealized_krw))?slots.reduce((v,x)=>v+x.realized_krw+x.unrealized_krw,0):null;
  return '<section class="panel"><h2>고점 낙폭 5분할 · '+title+'</h2><p>180일 고점 대비 −50% 이하 · +15% 발동 / 고점에서 4%p 반납 · 손절 없음</p>'
   +'<p>시작 원금 '+fmt(s.initial,'원')+' · 누적 손익 '+fmt(pnl,'원')+' · 누적 수익률 '+fmt(n(pnl)&&s.initial>0?pnl/s.initial*100:null,'%',2)+'</p>'
   +'<p>청산한 자리만 1시간 대기합니다. 미청산 손실도 평가손익에 포함합니다.</p>'
   +(valid?slots.map(x=>'<article><h3>분할 '+x.slot+' · '+(Object.hasOwn(labels,x.status)?labels[x.status]:'상태 미확인')+'</h3><dl>'
      +row('보유 종목',x.status==='flat'||x.status==='cooling'?'없음':symbol(x.market))
      +row('가용 원화',fmt(x.cash_krw,'원'))+row('실현손익',fmt(x.realized_krw,'원'))
      +row('평가손익',fmt(x.unrealized_krw,'원'))+row('보유 수익률',fmt(x.position_pct,'%',2))
      +row('트레일 청산선',fmt(x.trail_floor,'원',8))+row('재진입 남은 시간',fmt(x.cooldown_minutes,'분'))+'</dl></article>').join('')
    :'<p>5개 분할의 원장 자료를 확인할 수 없습니다.</p>')+'</section>';
}
export function deepHistory(d){
 const arr=d?.deep_pool?.recent;
 return '<section class="panel"><h2>5분할 주문 결과 · 최근 30건</h2>'+(!Array.isArray(arr)||!arr.length?'<p>완료된 주문이 없습니다.</p>':arr.map(o=>'<p>'+symbol(o.market)+' · '+(o.side==='BUY'?'매수':'매도')+' · '+fmt(Number(o.qty),'개',8)+' · 수수료 '+fmt(Number(o.fee),'원',2)+'</p>').join(''))+'</section>';
}
