"""Project API routes."""
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, CurrentUser, CurrentUserId
from app.core.permissions import Permission, check_permission
from app.models.project import Project
from app.models.stage import Stage
from app.schemas.project import (
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
    ProjectWithStages,
)

router = APIRouter()


@router.get("", response_model=list[ProjectRead])
async def list_projects(
    current_user: CurrentUser,
    db: DbSession,
):
    """List all projects for current user (owned and collaborated)."""
    # Get owned projects
    result = await db.execute(
        select(Project)
        .where(Project.owner_id == current_user.id)
        .where(Project.status != "deleted")
        .order_by(Project.updated_at.desc())
    )
    owned_projects = list(result.scalars().all())

    # Get collaborated projects
    from app.models.collaborator import Collaborator

    result = await db.execute(
        select(Project)
        .join(Collaborator, Project.id == Collaborator.project_id)
        .where(Collaborator.user_id == current_user.id)
        .where(Collaborator.accepted_at.isnot(None))
        .where(Project.status != "deleted")
        .order_by(Project.updated_at.desc())
    )
    collaborated_projects = list(result.scalars().all())

    # Combine and deduplicate
    all_projects = owned_projects + collaborated_projects
    seen_ids = set()
    unique_projects = []
    for project in all_projects:
        if project.id not in seen_ids:
            seen_ids.add(project.id)
            unique_projects.append(project)

    return [ProjectRead.model_validate(p) for p in unique_projects]


@router.post("", response_model=ProjectWithStages, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Create a new project with initial idea."""
    # Create project
    project = Project(
        owner_id=current_user.id,
        title=project_data.title,
        description=project_data.description,
        status="active",
        current_stage="idea",
    )
    db.add(project)
    await db.flush()

    # Create idea stage
    idea_stage = Stage(
        project_id=project.id,
        type="idea",
        status="completed",
        input_data={"content": project_data.idea},
    )
    db.add(idea_stage)

    await db.commit()
    await db.refresh(project)

    # Load stages
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.stages))
        .where(Project.id == project.id)
    )
    project = result.scalar_one()

    return ProjectWithStages.model_validate(project)


@router.get("/{project_id}", response_model=ProjectWithStages)
async def get_project(
    project_id: UUID,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Get project details with all stages."""
    await check_permission(current_user_id, project_id, Permission.VIEW, db)

    result = await db.execute(
        select(Project)
        .options(selectinload(Project.stages))
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return ProjectWithStages.model_validate(project)


@router.put("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Update project information."""
    await check_permission(current_user_id, project_id, Permission.EDIT, db)

    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Update fields
    update_data = project_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)

    return ProjectRead.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Delete a project (soft delete)."""
    await check_permission(current_user_id, project_id, Permission.DELETE, db)

    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    project.status = "deleted"
    await db.commit()
