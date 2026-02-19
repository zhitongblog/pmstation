"""FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.v1 import auth, projects, stages, collaborators, notes
from app.db.session import engine
from app.models import Base


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    async with engine.begin() as conn:
        # Create tables if not exist (for development)
        # In production, use Alembic migrations
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    description="AI-powered Product Manager Workstation",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(stages.router, prefix="/api/v1", tags=["stages"])
app.include_router(collaborators.router, prefix="/api/v1", tags=["collaborators"])
app.include_router(notes.router, prefix="/api/v1", tags=["notes"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Welcome to PMStation API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
