const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>(typeof v==='number'||(typeof v==='string'&&v.trim()!==''))&&Number.isFinite(Number(v))?Number(v):null;
const money=v=>num(v)===null?'—':Math.round(num(v)).toLocaleString('ko-KR')+'원';
const pct=v=>num(v)===null?'—':(num(v)>0?'+':'')+num(v).toFixed(2)+'%';
const labels={A_anchor_ioc:'A형 · 동일 체결 기준',H_volume_1p5:'거래량 배수 1.5',H_lows_1:'저점 상승 1회',H_active_18:'활동 분 18분',H_C_matched_exit:'C형 · 동일 청산',L_signal_p1:'희소 거래 신호 · 참여 1%',L_random_p1:'무작위 대조 · 참여 1%',L_signal_p0p5:'희소 거래 신호 · 참여 0.5%',L_random_p0p5:'무작위 대조 · 참여 0.5%'};

export function twoTrackResearch(r,now=Date.now()){
 if(!r||r.version!=='morning-two-track-v1-20261109'||r.paper_only!==true||r.live_orders_enabled!==false)return '';
 const observed=r.today?.coverage_ok===true||num(r.valid_finalized_days)>0;
 const kst=new Date(now+9*3600*1000),today=kst.toISOString().slice(0,10);
 const captured=Number.isFinite(Date.parse(r.updated_at))?new Date(Date.parse(r.updated_at)+9*3600*1000).toISOString().slice(0,10):'';
 const stale=today>=r.start_date&&today<=r.end_date&&(kst.getUTCHours()*60+kst.getUTCMinutes())>=542&&captured<today;
 const ended=r.health?.state==='EXPERIMENT_ENDED';
 const phase=ended?'등록 기간 종료':observed?'가상 관측 중':'등록 완료 · 시작 전';
 const card=m=>{
  const p=m.position;
  const quality=r.today?.errors?.[m.id]?.length||0;
  const value=observed&&!stale&&r.today?.coverage_ok!==false&&!quality?m.return_pct:null;
  return `<article class="sd-card"><div class="sd-card-head"><h3>${esc(labels[m.id]||m.id)}</h3><span class="sd-chip">가상</span></div><div class="sd-result"><span>가상 계좌 누적 수익률</span><strong class="${num(value)>0?'gain':num(value)<0?'drop':''}">${pct(value)}</strong><p>최초 가상 원금 100만원 · 미투입 현금 포함</p></div><dl class="sd-metrics"><div><dt>가상 평가액</dt><dd>${money(m.equity_krw)}</dd></div><div><dt>누적 실현손익</dt><dd>${observed?money(m.realized):'—'}</dd></div><div><dt>완료 거래</dt><dd>${esc(m.closed_trades??'—')}건</dd></div><div><dt>현재 보유</dt><dd>${p?esc(String(p.market).replace(/^KRW-/,'')):'현금'}</dd></div></dl>${quality?`<p class="sd-alert">오늘 자료 품질 사건 ${quality}종류 · 통계 판정 보류</p>`:''}<details class="sd-detail" data-expand-id="two-${esc(m.id)}"><summary>비용·체결 민감도</summary><p>추가 비용 30bp/방향 누적 가정액 ${observed?money(m.extra_cost_totals?.['30']):'—'} · 2초 지연 가상 평가액 ${observed?money(m.delay2_equity):'—'}</p><p>미체결·부분체결·잔량은 서버 원장에 별도 보존합니다. 가상 계좌를 합산한 실현 가능 수익이 아닙니다.</p></details></article>`;
 };
 const group=(title,detail,filter)=>`<section class="sd-section"><div class="sd-heading"><h2>${title}</h2></div><p class="sd-empty">${detail}</p><div class="sd-grid">${(r.models||[]).filter(filter).map(card).join('')}</div></section>`;
 return `<section class="sd sd-two-track" aria-label="두 갈래 아침 가상 연구"><header class="review-card"><strong>두 갈래 아침 가상 연구</strong><p>${phase} · ${esc(r.start_date)} ~ ${esc(r.end_date)} · 한국시간</p><p>완료 관측일 ${esc(r.valid_finalized_days??0)}일 · ${esc(r.review||'시작 전')} · 실제 매매 OFF</p><small>갱신 ${esc(r.updated_at||'—')}<br>활동성·희소 거래를 분리한 연구입니다. 실전 전략과 기존 14개 가상 계좌는 그대로 유지합니다.</small></header>${stale?'<p class="sd-alert">오늘 연구 자료 미수신 · 마지막 저장값입니다. 현재 수익률은 확인 전까지 표시하지 않습니다.</p>':''}${r.today?.coverage_ok===false?'<p class="sd-alert">오늘 사전 입력 불완전 · 무수익으로 간주하지 않으며 통계 판정에서 구분합니다.</p>':''}${group('같은 출발 기준','신규 비교군과 같은 IOC 추정·청산 조건',m=>m.id==='A_anchor_ioc')}${group('H · 활동성 높은 종목','기존 조건을 하나씩 완화하거나 C형 신호를 비교',m=>m.id.startsWith('H_'))}${group('L · 희소 거래 소액','주문 원금은 자기 현금 5%·5만원·사전 거래대금 참여 한도 중 최소값',m=>m.id.startsWith('L_'))}<p class="sd-empty">가격 손절 -2% · 트레일 4% / 1.5%p는 이 가상 연구의 공통 조건입니다. 실제 체결이 아닌 공개 호가 추정이며 자동 실전 전환은 없습니다. 입력·청산 자료가 불완전하면 수익률을 채택 근거로 사용할 수 없습니다.</p></section>`;
}
