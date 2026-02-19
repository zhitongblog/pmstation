"""Authentication API routes."""
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from google.oauth2 import id_token
from google.auth.transport import requests

from app.api.deps import DbSession, CurrentUser
from app.config import get_settings
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.user import UserRead, GoogleUserInfo

router = APIRouter()
settings = get_settings()


class GoogleAuthRequest(BaseModel):
    """Request body for Google OAuth."""
    code: str | None = None
    access_token: str | None = None  # Can be ID token from GIS


class TokenResponse(BaseModel):
    """Response with JWT token."""
    access_token: str
    token_type: str = "bearer"
    user: UserRead


@router.post("/google", response_model=TokenResponse)
async def google_auth(
    request: GoogleAuthRequest,
    db: DbSession,
):
    """
    Authenticate with Google OAuth.

    Either provide an authorization code (for code flow) or
    an ID token (from Google Identity Services).
    """
    logger.info(f"[AUTH] Received request: access_token={bool(request.access_token)}, code={bool(request.code)}")
    google_user_info = None

    if request.access_token:
        # This is actually a JWT ID token from Google Identity Services
        try:
            logger.info(f"[AUTH] Verifying ID token with client_id: {settings.google_client_id[:20]}...")
            # Verify the ID token
            idinfo = id_token.verify_oauth2_token(
                request.access_token,
                requests.Request(),
                settings.google_client_id
            )
            logger.info(f"[AUTH] Token verified successfully for: {idinfo.get('email')}")

            # Extract user info from verified token
            google_user_info = GoogleUserInfo(
                id=idinfo["sub"],
                email=idinfo["email"],
                name=idinfo.get("name", idinfo["email"]),
                picture=idinfo.get("picture"),
            )
        except Exception as e:
            logger.info(f"[AUTH] Token verification failed: {type(e).__name__}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Google ID token: {str(e)}",
            )

    elif request.code:
        # Exchange code for tokens
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": request.code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": f"{settings.cors_origins[0]}/auth/callback",
                    "grant_type": "authorization_code",
                },
            )
            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Failed to exchange authorization code",
                )
            tokens = token_response.json()

            # Get user info
            userinfo_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
            if userinfo_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Failed to get user info",
                )
            data = userinfo_response.json()
            google_user_info = GoogleUserInfo(
                id=data["id"],
                email=data["email"],
                name=data.get("name", data["email"]),
                picture=data.get("picture"),
            )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either code or access_token is required",
        )

    # Find or create user
    result = await db.execute(
        select(User).where(User.google_id == google_user_info.id)
    )
    user = result.scalar_one_or_none()

    if user:
        # Update existing user
        user.name = google_user_info.name
        user.avatar_url = google_user_info.picture
        user.updated_at = datetime.now(timezone.utc)
    else:
        # Create new user
        user = User(
            google_id=google_user_info.id,
            email=google_user_info.email,
            name=google_user_info.name,
            avatar_url=google_user_info.picture,
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)

    # Create JWT token
    access_token = create_access_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        user=UserRead.model_validate(user),
    )


@router.get("/me", response_model=UserRead)
async def get_current_user_info(current_user: CurrentUser):
    """Get current user information."""
    return UserRead.model_validate(current_user)


@router.post("/logout")
async def logout():
    """
    Logout user.

    Note: Since we use JWT, actual token invalidation happens client-side.
    This endpoint can be used for any server-side cleanup if needed.
    """
    return {"message": "Logged out successfully"}
