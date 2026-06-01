from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.database import init_db

app = FastAPI(title="AI Lab - ReAct Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def root():
    return {"message": "AI Lab - ReAct Agent API", "docs": "/docs"}
