from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .fred_client import get_macro_snapshot
from .routers import market, property

app = FastAPI(title="Houston Housing Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market.router)
app.include_router(property.router)


@app.get("/api/macro/snapshot")
def macro_snapshot():
    return get_macro_snapshot()
