import os

import duckdb

DB_PATH = os.environ.get(
    "HOUSING_DB_PATH",
    os.path.join(os.path.dirname(__file__), "..", "etl", "housing.duckdb"),
)

_con = None


def get_connection() -> duckdb.DuckDBPyConnection:
    global _con
    if _con is None:
        _con = duckdb.connect(DB_PATH, read_only=True)
    return _con
