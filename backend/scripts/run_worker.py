from dotenv import load_dotenv
from rq import Worker

from app.services.queue import get_redis_connection


if __name__ == "__main__":
    load_dotenv()
    worker = Worker(["map_analysis"], connection=get_redis_connection())
    worker.work()
