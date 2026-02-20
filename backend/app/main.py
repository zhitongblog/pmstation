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
    # Startup - try to connect to database with retries
    import asyncio
    max_retries = 5
    retry_delay = 2

    for attempt in range(max_retries):
        try:
            async with engine.begin() as conn:
                # Create tables if not exist (for development)
                # In production, use Alembic migrations
                await conn.run_sync(Base.metadata.create_all)
            print(f"Database connected successfully on attempt {attempt + 1}")
            break
        except Exception as e:
            print(f"Database connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                print(f"Retrying in {retry_delay} seconds...")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                print("Warning: Could not connect to database, starting without it")

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
    allow_origins=[
        "http://localhost:3000",
        "https://pmstationnew.vercel.app",
    ],
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
