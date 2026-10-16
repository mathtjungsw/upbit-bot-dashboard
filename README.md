# 업비트 자동매매 현황

모바일 현황·거래내역·가상 연구 비교. HTML/CSS/JavaScript는 GitHub Pages에 배포하고,
개인 계좌 자료는 AWS의 별도 비밀번호 인증 API로만 조회한다.

- 공개 화면: https://mathtjungsw.github.io/upbit-bot-dashboard/
- API: 기존 HTTPS 호스트의 `/upbit-api/` → `127.0.0.1:8881`.
- 새 서비스 `upbit-dashboard`, 코드 `/opt/upbit-dashboard`.
- 별도 인증 DB `/var/lib/upbit-dashboard/auth.db`.
- 기존 수기 기록장 `/api/`, 키움 대시보드 `/bot-api/`를 유지한다.
- 비밀번호·API 키·계좌 원본·실제 거래 기록을 GitHub에 저장하지 않는다.

## 데이터와 계산

봇이 이미 계산한 값을 `web_dashboard_export.py`로 1분마다 원자적으로 저장한다.
웹 서버는 이 파일과 연구 요약, 최종 매매 JSONL만 읽는다. 업비트 API를 추가 호출하지 않는다.
웹 자료가 오래되거나 연결이 끊기면 마지막 관측값과 지연 경고를 표시한다.

누적 손익은 청산 추정 자산에서 순투입 원금을 뺀 값이고, 누적 수익률의 분모는
순투입 원금이다. 오늘은 KST 00시~현재, 7일·30일은 최근 기간 TWR로 구분한다.
가상 연구는 기존 상한 없음·15%·20% 실험의 시작 시점·원금을 유지한다.
부분 청산은 최종 포지션 종료 기록에 합산된 순손익을 표시한다.

실전 전략·99.5% 배분·트레일링 4%/1.5%p·ATR 손절·24시간 재진입 조건과
원래 회계 산식은 변경하지 않는다. 상세 거래·연구 로그는 계속 서버에 저장한다.

## 구글 시트 해제와 신규매수 중지

기존 시트의 과거 자료를 보존하되 런타임 읽기·기록·제어를 해제한다.
전환 직전 B2 상태를 한 번 확인해 `/opt/bots/upbit/web_buy_pause.json`의
`paused` 불리언으로 이전한다. 누락/손상 시 신규 매수를 중지한다.
보유 포지션의 익절·손절 감시는 계속한다. 웹 매매/중지/재개 API는 없다.

## 별도 비밀번호

서버에서 본인이 다음 명령을 실행하고 비밀번호(12~128자)를 두 번 입력한다.
입력 문자는 표시되지 않는다. 실제 비밀번호를 채팅·저장소에 남기지 않는다.

```sh
cd /opt/upbit-dashboard
sudo -u ubuntu /opt/bots/upbit/.venv/bin/python -m backend.server password
```

비밀번호는 scrypt 해시, 세션은 SHA-256 해시로 저장한다. 로그인은 7일간 유지되고
로그아웃·비밀번호 재설정 시 세션을 폐기한다. 인증 실패 횟수는 DB에 저장한다.

## 검증과 로컬 미리보기

```sh
python -m unittest discover -s tests -v
python -m py_compile backend/server.py backend/reader.py web_dashboard_export.py buy_pause.py
node --check docs/app.js
python -m http.server 8767 --bind 127.0.0.1 --directory docs
```

`http://127.0.0.1:8767/?demo`는 합성 예시이며 운영 도메인에서 demo는 사용할 수 없다.
아이콘은 Lucide 에셋을 포함하며 라이선스는 `docs/LUCIDE-LICENSE`에 보관한다.

프런트 변경은 main의 docs/를 push하면 반영된다. 서버 코드는 별도 백업·적용이
필요하다. 과거 설치 스크립트를 현재 소스 확인 없이 재실행하지 않는다.
