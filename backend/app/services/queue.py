from redis import Redis
from rq import Queue

from app.config import Config


def get_redis_connection() -> Redis:
    return Redis.from_url(Config.REDIS_URL)


def get_analysis_queue() -> Queue:
    return Queue("map_analysis", connection=get_redis_connection())
