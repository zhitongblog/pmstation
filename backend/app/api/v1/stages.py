"""Stage API routes for workflow management."""
import logging
from uuid import UUID

from fastapi import APIRouter, Body, HTTPException, status

logger = logging.getLogger(__name__)
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, CurrentUserId
from app.core.permissions import Permission, check_permission
from app.models.project import Project
from app.models.stage import Stage
from typing import Any
from app.schemas.stage import StageRead, SelectionInput, FeatureSelect, PlatformSelection

router = APIRouter()

# Stage type order (prototype removed, platform added)
STAGE_ORDER = ["idea", "direction", "platform", "features", "demo", "prd", "testcases"]


def get_next_stage(current_stage: str) -> str | None:
    """Get the next stage type."""
    try:
        idx = STAGE_ORDER.index(current_stage)
        if idx < len(STAGE_ORDER) - 1:
            return STAGE_ORDER[idx + 1]
    except ValueError:
        pass
    return None


@router.get("/projects/{project_id}/stages", response_model=list[StageRead])
async def list_stages(
    project_id: UUID,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Get all stages for a project."""
    await check_permission(current_user_id, project_id, Permission.VIEW, db)

    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .order_by(Stage.created_at)
    )
    stages = result.scalars().all()

    return [StageRead.model_validate(s) for s in stages]


@router.get("/projects/{project_id}/stages/{stage_type}", response_model=StageRead)
async def get_stage(
    project_id: UUID,
    stage_type: str,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Get a specific stage."""
    await check_permission(current_user_id, project_id, Permission.VIEW, db)

    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .where(Stage.type == stage_type)
        .order_by(Stage.version.desc())
    )
    stage = result.scalars().first()

    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stage '{stage_type}' not found",
        )

    return StageRead.model_validate(stage)


# NOTE: Platform selection route - save user's platform choices
@router.put("/projects/{project_id}/stages/platform/select", response_model=StageRead)
async def select_platform(
    project_id: UUID,
    selection: PlatformSelection,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Save platform selection for the project."""
    await check_permission(current_user_id, project_id, Permission.EDIT, db)

    # Check if direction stage is confirmed
    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .where(Stage.type == "direction")
        .order_by(Stage.version.desc())
    )
    direction_stage = result.scalars().first()

    if not direction_stage or direction_stage.status != "confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Direction must be confirmed before platform selection",
        )

    # Check if platform stage already exists
    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .where(Stage.type == "platform")
        .order_by(Stage.version.desc())
    )
    existing_stage = result.scalars().first()

    selection_data = selection.model_dump()

    if existing_stage:
        # Update existing stage
        existing_stage.output_data = selection_data
        existing_stage.selected_option = selection_data
        existing_stage.status = "confirmed"
        await db.commit()
        await db.refresh(existing_stage)
        return StageRead.model_validate(existing_stage)
    else:
        # Create new platform stage
        stage = Stage(
            project_id=project_id,
            type="platform",
            status="confirmed",
            output_data=selection_data,
            selected_option=selection_data,
            version=1,
        )
        db.add(stage)
        await db.commit()
        await db.refresh(stage)

        # Update project current stage
        result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one()
        project.current_stage = "platform"
        await db.commit()

        return StageRead.model_validate(stage)


@router.post("/projects/{project_id}/stages/{stage_type}/generate", response_model=StageRead)
async def generate_stage(
    project_id: UUID,
    stage_type: str,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Trigger AI generation for a stage."""
    await check_permission(current_user_id, project_id, Permission.GENERATE, db)

    if stage_type not in STAGE_ORDER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid stage type: {stage_type}",
        )

    # Get project
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Check if previous stage is confirmed (except for direction which follows idea)
    stage_idx = STAGE_ORDER.index(stage_type)
    if stage_idx > 0:
        prev_stage_type = STAGE_ORDER[stage_idx - 1]
        result = await db.execute(
            select(Stage)
            .where(Stage.project_id == project_id)
            .where(Stage.type == prev_stage_type)
            .order_by(Stage.version.desc())
        )
        prev_stage = result.scalars().first()

        if not prev_stage or prev_stage.status not in ["completed", "confirmed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Previous stage '{prev_stage_type}' must be completed first",
            )

    # Check if stage already exists
    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .where(Stage.type == stage_type)
        .order_by(Stage.version.desc())
    )
    existing_stage = result.scalars().first()

    # Create new stage version
    new_version = (existing_stage.version + 1) if existing_stage else 1

    stage = Stage(
        project_id=project_id,
        type=stage_type,
        status="generating",
        version=new_version,
    )
    db.add(stage)
    await db.flush()

    # Call AI agent based on stage type
    from app.ai.agents import get_agent

    try:
        agent = get_agent(stage_type)
        output_data = await agent.generate(project_id, db)

        stage.output_data = output_data
        stage.status = "completed"

        # Update project current stage
        project.current_stage = stage_type

        await db.commit()
        await db.refresh(stage)

        return StageRead.model_validate(stage)
    except Exception as e:
        import traceback
        logger.error(f"[GENERATE ERROR] Stage: {stage_type}, Error: {str(e)}")
        logger.error(f"[GENERATE ERROR] Traceback:\n{traceback.format_exc()}")
        # Rollback to remove the failed stage record
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI generation failed: {str(e)}",
        )


# NOTE: Specific routes must come BEFORE generic routes with path parameters
@router.put("/projects/{project_id}/stages/features/select-features", response_model=StageRead)
async def select_features(
    project_id: UUID,
    current_user_id: CurrentUserId,
    db: DbSession,
    selection: dict = Body(...),
):
    """Select features for the features stage."""
    logger.debug(f"[SELECT-FEATURES] Raw body received: {selection}")
    logger.debug(f"[SELECT-FEATURES] Type of body: {type(selection)}")

    # Manually validate
    selected_ids = selection.get("selected_ids", [])
    logger.debug(f"[SELECT-FEATURES] selected_ids: {selected_ids}, types: {[type(x) for x in selected_ids[:5]]}")
    await check_permission(current_user_id, project_id, Permission.EDIT, db)

    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .where(Stage.type == "features")
        .order_by(Stage.version.desc())
    )
    stage = result.scalars().first()

    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Features stage not found",
        )

    if stage.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stage must be completed before selection",
        )

    stage.selected_option = {"selected_ids": selected_ids}
    stage.status = "confirmed"

    await db.commit()
    await db.refresh(stage)

    return StageRead.model_validate(stage)


@router.put("/projects/{project_id}/stages/{stage_type}/select", response_model=StageRead)
async def select_stage_option(
    project_id: UUID,
    stage_type: str,
    selection: SelectionInput,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Select an option for a stage (e.g., direction selection)."""
    logger.debug(f"[SELECT] Received selection: {selection}")
    await check_permission(current_user_id, project_id, Permission.EDIT, db)

    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .where(Stage.type == stage_type)
        .order_by(Stage.version.desc())
    )
    stage = result.scalars().first()

    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stage '{stage_type}' not found",
        )

    if stage.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stage must be completed before selection",
        )

    # Handle direction selection (selected_id)
    if selection.selected_id is not None:
        if stage.output_data and "directions" in stage.output_data:
            selected = next(
                (d for d in stage.output_data["directions"] if d["id"] == selection.selected_id),
                None,
            )
            if selected:
                stage.selected_option = selected
                stage.status = "confirmed"
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid selection ID",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No directions available to select from",
            )
    # Handle feature selection (selected_ids) - fallback for generic endpoint
    elif selection.selected_ids is not None:
        stage.selected_option = {"selected_ids": selection.selected_ids}
        stage.status = "confirmed"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either selected_id or selected_ids must be provided",
        )

    await db.commit()
    await db.refresh(stage)

    return StageRead.model_validate(stage)


@router.put("/projects/{project_id}/stages/{stage_type}/confirm", response_model=StageRead)
async def confirm_stage(
    project_id: UUID,
    stage_type: str,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Confirm a stage to proceed to the next."""
    await check_permission(current_user_id, project_id, Permission.EDIT, db)

    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .where(Stage.type == stage_type)
        .order_by(Stage.version.desc())
    )
    stage = result.scalars().first()

    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stage '{stage_type}' not found",
        )

    if stage.status not in ["completed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stage must be completed before confirmation",
        )

    stage.status = "confirmed"

    # Update project to next stage
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one()
    next_stage = get_next_stage(stage_type)
    if next_stage:
        project.current_stage = next_stage

    await db.commit()
    await db.refresh(stage)

    return StageRead.model_validate(stage)
