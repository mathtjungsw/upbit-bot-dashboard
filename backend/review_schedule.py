"""Read-only milestones anchored exclusively to an actual research start."""
import datetime as dt
import json
import math
from pathlib import Path

KST = dt.timezone(dt.timedelta(hours=9))


def parse(value):
    result = dt.datetime.fromisoformat(str(value))
    return result.replace(tzinfo=KST) if result.tzinfo is None else result.astimezone(KST)


def schedule(root, research, now=None):
    now = now or dt.datetime.now(KST)
    if not research.get('available'):
        return dict(status='not_started', milestones=[], message='새 매도 연구 시작 대기')
    try:
        start = parse(research['started_at'])
        if start > now:
            raise ValueError('future start')
    except (KeyError, ValueError, TypeError):
        return dict(status='invalid', milestones=[], message='연구 시작 시각 확인 필요')
    # Completions are operator records, not browser dismissal or elapsed-time inference.
    completed = {}
    warning = None
    path = Path(root)/'research_review_completions.json'
    if path.exists():
        try:
            saved = json.loads(path.read_text(encoding='utf-8'))
            if (research.get('version') and research.get('manifest_hash') and
                saved.get('study_version') == research.get('version') and
                parse(saved.get('started_at')) == start and
                saved.get('manifest_hash') == research.get('manifest_hash')):
                completed = saved.get('completed', {})
                if not isinstance(completed, dict):
                    raise ValueError('invalid completions')
        except (OSError, ValueError, TypeError, AttributeError):
            warning = '점검 완료 기록 확인 필요 · 알림 유지'
    milestones = []
    for days, title in ((14,'2주 중간 점검'),(28,'4주 전략 분석·검토')):
        due = start+dt.timedelta(days=days)
        record = completed.get(str(days)) or {}
        confirmed = None
        try:
            at = parse(record.get('completed_at'))
            if due <= at <= now and str(record.get('report') or '').strip():
                confirmed = at.isoformat()
        except (ValueError, TypeError, AttributeError):
            pass
        milestones.append(dict(days=days, title=title, due_at=due.isoformat(),
            status='completed' if confirmed else 'due' if now>=due else 'upcoming',
            completed_at=confirmed,
            remaining_days=max(0, int(math.ceil((due-now).total_seconds()/86400)))))
    pending = [x for x in milestones if x['status']=='due']
    return dict(status='due' if pending else 'scheduled', started_at=start.isoformat(),
        elapsed_days=int((now-start).total_seconds()//86400), milestones=milestones,
        warning=warning, message=pending[-1]['title']+' 필요' if pending else '연구 데이터 누적 중',
        automatic_strategy_change=False)
