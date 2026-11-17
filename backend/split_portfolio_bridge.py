"""Minimal authenticated Reader wrapper; no new endpoint or auth changes."""
import datetime as dt
import json
from pathlib import Path


def attach(data,root):
    two=Path(root)/"morning_research_two_track"/"status.json"
    if two.exists():
        try:
            if two.stat().st_size>1024*1024:raise ValueError('research summary too large')
            value=json.loads(two.read_text(encoding='utf-8'))
            if (isinstance(value,dict) and value.get('version')=='morning-two-track-v1-20261109'
                    and value.get('paper_only') is True and value.get('live_orders_enabled') is False):
                data['morning_two_track']=value
        except (OSError,ValueError,TypeError):
            data['morning_two_track_error']='두 갈래 가상 연구 요약을 읽지 못했습니다'
    research=Path(root)/"morning_research"/"morning_research_status.json"
    if research.exists():
        try:
            observed=json.loads(research.read_text(encoding="utf-8"))
            if not isinstance(observed,dict):raise ValueError("research object required")
            if (observed.get("version")=="morning-paper-v1-20261105" and
                    observed.get("paper_only") is True and observed.get("live_orders_enabled") is False):
                data["morning_research"]=observed
        except (OSError,ValueError,TypeError):
            # Research display failure must never hide the actual live account.
            data["morning_research_error"]="가상 아침 연구 상태를 읽지 못했습니다"
    path=Path(root)/"split_portfolio_status.json"
    if not path.exists():return data
    split=json.loads(path.read_text())
    if split.get("version") not in ("split-33-33-33-1-v1","split-four-v2") or not split.get("live"):
        return data
    stamp=dt.datetime.fromisoformat(split["updated_at"])
    now=dt.datetime.now(dt.timezone.utc)
    age=(now-stamp.astimezone(dt.timezone.utc)).total_seconds()
    data["split_portfolio"]=split
    data["observed_at"]=split["updated_at"]
    data["source"]["service_active"]=0<=age<90
    data["runtime"]=None # legacy health must not masquerade as split health
    data["warnings"]=[]
    if age<0 or age>=90:data["warnings"].append("분할 운용 자료 갱신 지연")
    if split.get("hold"):data["warnings"].append("계좌 대사 필요: 신규 매수 중지")
    if not split.get("warning_data_ok"):data["warnings"].append("유의 지정 조회 지연: 신규 매수 보류")
    return data
