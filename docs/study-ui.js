const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>typeof v==='number'&&Number.isFinite(v)?`${v>0?'+':''}${v.toFixed(2)}%`:'—';
const date=v=>v&&Number.isFinite(Date.parse(v))?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v)):'—';

export function reviewNotice(r){
 if(!r||r.status==='not_started')return '<section class="review-card"><strong>새 매도 연구 시작 대기</strong><p>실제 연구 시작 후 2주·4주 점검일이 표시됩니다.</p></section>';
 if(r.status==='invalid')return '<section class="review-card due" role="status"><strong>연구 시작 시각 확인 필요</strong></section>';
 const due=(r.milestones||[]).some(m=>m.status==='due');
 return `<section class="review-card ${due?'due':''}" aria-label="연구 점검 일정" ${due?'role="status"':''}><div><strong>${esc(r.message)}</strong><span>시작 후 ${esc(r.elapsed_days)}일 경과</span></div><p>연구 시작 ${date(r.started_at)} · 한국시간</p><div class="review-milestones">${(r.milestones||[]).map(m=>`<article class="${m.status==='due'?'review-due':''}"><b>${esc(m.title)}</b><time>${date(m.due_at)}</time><span>${m.status==='completed'?'점검 완료':m.status==='due'?'점검 필요 · 완료 기록 전까지 유지':`${esc(m.remaining_days)}일 남음`}</span></article>`).join('')}</div>${r.warning?`<p>${esc(r.warning)}</p>`:''}<small>점검 시점 안내입니다. 분석이나 실전 전략 변경이 자동 실행되지는 않습니다.</small></section>`;
}

export function runtimePanel(r, now=Date.now()){
 if(!r)return '';
 const valid=v=>v&&Number.isFinite(Date.parse(v));
 const seconds=valid(r.last_loop_at)?Math.max(0,(now-Date.parse(r.last_loop_at))/1000):Infinity;
 const faults=Object.keys(r.failures||{});
 const stale=seconds>90;
 const title=stale?'매도 감시 상태 확인 필요':r.buy_blocked?'통신·계좌 확인 중 · 신규매수 보류':faults.length?'일부 API 확인 필요':'매도 감시 실행 중';
 return `<details class="runtime-card ${stale||r.buy_blocked||faults.length?'runtime-warning':''}" aria-label="매매 감시 상태" ${stale||r.buy_blocked||faults.length?'open':''}><summary><strong>${title}</strong><small>${r.fast_monitor?'5초':'30초'} 목표 · 상세 보기</small></summary><dl><div><dt>마지막 판단 시작</dt><dd>${date(r.last_loop_at)} ${Number.isFinite(seconds)?`· ${Math.floor(seconds)}초 전`:''}</dd></div><div><dt>잔고 확인</dt><dd>${date(r.last_success?.accounts)}</dd></div><div><dt>시세 확인</dt><dd>${date(r.last_success?.ticker)}</dd></div><div><dt>감시 목표</dt><dd>${r.fast_monitor?'5초 · 빠른 감시':'30초 · 일반 감시'}</dd></div></dl>${faults.length?`<p>조회 오류 ${faults.map(esc).join(' · ')} · 주문·잔고 확인 전 재주문하지 않습니다.</p>`:''}<small>통신 지연 시 실제 판단 간격은 길어질 수 있습니다.</small></details>`;
}

export function exitResearch(r){
 if(!r?.available)return '';
 const seven=r.version?.startsWith('strategy10-seven');
 const age=r.updated_at&&Number.isFinite(Date.parse(r.updated_at))?(Date.now()-Date.parse(r.updated_at))/1000:Infinity;
 const warning=age>180?'<p class="notice" role="status">새 매도 연구 갱신 지연 · 마지막 저장값입니다. 경과일은 데이터 정상 수집을 보장하지 않습니다.</p>':'';
 const errors=r.error_count>0?`<p class="section-note">누적 ${seven?'품질 사건(정책별 중복 포함)':'연구 오류'} ${esc(r.error_count)}건 · 현재 장애 여부는 갱신 시각과 함께 확인하세요.</p>`:'';
 return `<section class="analysis-section exit-research"><div class="section-heading"><h2>${seven?'손절6% · 신규30% 비교 연구':'이전 매도 조건 비교'}</h2><span>고정 ${esc(r.rows.length)}개 비교군</span></div><p class="section-note">시작 ${date(r.started_at)} · 갱신 ${date(r.updated_at)}<br>같은 원금·현금 출발 · ${seven?'매수/매도/휴식 조건을 분리 비교':'매수 조건 동일'}</p>${warning}${errors}${seven&&r.feature_issue_count>0?`<p class="notice" role="status">기초지표 ${esc(r.feature_issue_count)}건 불완전 · 가상 신규 진입 차단 중입니다. 표시 수익률은 유효한 전략 비교 성과로 해석하지 마세요.</p>`:seven&&r.quality_state==='INCOMPLETE'?'<p class="notice" role="status">이력에 자료 품질 문제가 있어 비교 결과는 미확정입니다.</p>':''}<div class="strategy-grid">${r.rows.map(s=>`<article class="strategy-row"><div><h3>${esc(s.name)}</h3><small>완료 ${esc(s.trades??'—')}건 · 보유 ${esc((s.open_ticker||'현금').replace('KRW-',''))}</small></div><strong class="${s.marked_return_pct>0?'profit':s.marked_return_pct<0?'loss':''}">${pct(s.marked_return_pct)}</strong><p>최대낙폭 ${pct(s.max_drawdown_pct)}<span>비용 스트레스 ${pct(s.stress_return_pct)}</span></p></article>`).join('')}</div><p class="footnote">${seven?'30초 시세·호가 관측의 독립 가상계좌입니다. 기초 자료가 불완전한 프레임은 신규 진입을 차단합니다. E2 지정가 체결과 통계 우위는 미검증이며 비용 스트레스 —는 미계산입니다.':'같은5초 시세를 사용한 이전 연구입니다. 실전 거래 시각과 다를 수 있으며 비용 스트레스는 동일 경로의 매도 비용 민감도입니다.'}</p></section>`;
}
