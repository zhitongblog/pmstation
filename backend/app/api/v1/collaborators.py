"""Collaborator API routes."""
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import DbSession, CurrentUserId
from app.core.permissions import require_owner, Permission, check_permission
from app.models.collaborator import Collaborator
from app.models.project import Project
from app.models.user import User
from app.schemas.collaborator import CollaboratorCreate, CollaboratorRead, CollaboratorWithUser

router = APIRouter()


@router.get("/projects/{project_id}/collaborators", response_model=list[CollaboratorWithUser])
async def list_collaborators(
    project_id: UUID,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """List all collaborators for a project."""
    await check_permission(current_user_id, project_id, Permission.VIEW, db)

    result = await db.execute(
        select(Collaborator, User)
        .join(User, Collaborator.user_id == User.id)
        .where(Collaborator.project_id == project_id)
        .order_by(Collaborator.invited_at.desc())
    )
    rows = result.all()

    collaborators = []
    for collab, user in rows:
        collaborators.append(
            CollaboratorWithUser(
                id=collab.id,
                project_id=collab.project_id,
                user_id=collab.user_id,
                role=collab.role,
                invited_at=collab.invited_at,
                accepted_at=collab.accepted_at,
                user_name=user.name,
                user_email=user.email,
                user_avatar=user.avatar_url,
            )
        )

    return collaborators


@router.post("/projects/{project_id}/collaborators", response_model=CollaboratorRead, status_code=status.HTTP_201_CREATED)
async def invite_collaborator(
    project_id: UUID,
    invitation: CollaboratorCreate,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Invite a collaborator by email."""
    await require_owner(current_user_id, project_id, db)

    # Find user by email
    result = await db.execute(
        select(User).where(User.email == invitation.email)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found with this email",
        )

    # Check if user is the owner
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one()
    if project.owner_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot invite the project owner as collaborator",
        )

    # Check if already a collaborator
    result = await db.execute(
        select(Collaborator)
        .where(Collaborator.project_id == project_id)
        .where(Collaborator.user_id == user.id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a collaborator",
        )

    # Create collaborator
    collaborator = Collaborator(
        project_id=project_id,
        user_id=user.id,
        role="viewer",
        accepted_at=datetime.utcnow(),  # Auto-accept for now
    )
    db.add(collaborator)
    await db.commit()
    await db.refresh(collaborator)

    return CollaboratorRead.model_validate(collaborator)


@router.delete("/projects/{project_id}/collaborators/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_collaborator(
    project_id: UUID,
    user_id: UUID,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Remove a collaborator from the project."""
    await require_owner(current_user_id, project_id, db)

    result = await db.execute(
        select(Collaborator)
        .where(Collaborator.project_id == project_id)
        .where(Collaborator.user_id == user_id)
    )
    collaborator = result.scalar_one_or_none()

    if not collaborator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collaborator not found",
        )

    await db.delete(collaborator)
    await db.commit()
