"""Local new-buy pause only. Exit monitoring always remains independent."""
import json
from pathlib import Path

DEFAULT_PATH='/opt/bots/upbit/web_buy_pause.json'


def new_buys_paused(path=DEFAULT_PATH):
    try:
        value=json.loads(Path(path).read_text(encoding='utf-8')).get('paused')
        return value if isinstance(value,bool) else True
    except (OSError,ValueError,TypeError,AttributeError):
        return True
