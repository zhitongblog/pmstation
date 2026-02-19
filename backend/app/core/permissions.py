"""Permission control for project access."""
from enum import Enum
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.collaborator import Collaborator


class Permission(Enum):
    """Available permissions."""
    VIEW = "view"
    EDIT = "edit"
    DELETE = "delete"
    GENERATE = "generate"
    ADD_NOTE = "add_note"
    MANAGE_COLLABORATORS = "manage_collaborators"


# Role-based permissions
ROLE_PERMISSIONS: dict[str, list[Permission]] = {
    "owner": [
        Permission.VIEW,
        Permission.EDIT,
        Permission.DELETE,
        Permission.GENERATE,
        Permission.ADD_NOTE,
        Permission.MANAGE_COLLABORATORS,
    ],
    "viewer": [
        Permission.VIEW,
        Permission.ADD_NOTE,
    ],
}


async def get_user_role(
    user_id: UUID,
    project_id: UUID,
    db: AsyncSession,
) -> str | None:
    """Get user's role in a project."""
    # Check if user is owner
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == user_id,
        )
    )
    if result.scalar_one_or_none():
        return "owner"

    # Check if user is collaborator
    result = await db.execute(
        select(Collaborator).where(
            Collaborator.project_id == project_id,
            Collaborator.user_id == user_id,
            Collaborator.accepted_at.isnot(None),
        )
    )
    collaborator = result.scalar_one_or_none()
    if collaborator:
        return collaborator.role

    return None


async def check_permission(
    user_id: UUID,
    project_id: UUID,
    required_permission: Permission,
    db: AsyncSession,
) -> bool:
    """Check if user has required permission for a project."""
    # Check if project exists
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Get user role
    role = await get_user_role(user_id, project_id, db)

    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No access to this project",
        )

    # Check permission
    allowed_permissions = ROLE_PERMISSIONS.get(role, [])
    if required_permission not in allowed_permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied",
        )

    return True


async def require_owner(
    user_id: UUID,
    project_id: UUID,
    db: AsyncSession,
) -> bool:
    """Require user to be project owner."""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == user_id,
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owner can perform this action",
        )

    return True
