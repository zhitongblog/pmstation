"""Demo API routes for interactive demo generation with SSE streaming."""
import json
import logging
from uuid import UUID
from typing import Any

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import DbSession, CurrentUserId
from app.core.permissions import Permission, check_permission
from app.models.project import Project
from app.models.stage import Stage
from app.ai.agents.interactive_demo_agent import InteractiveDemoAgent

logger = logging.getLogger(__name__)

router = APIRouter()


class ModifyRequest(BaseModel):
    """Request body for page modification."""
    instruction: str
    page_id: str


class PageRegenerateRequest(BaseModel):
    """Request body for page regeneration."""
    pass


class PageSkipRequest(BaseModel):
    """Request body for skipping a page."""
    reason: str | None = None


class PageUpdateRequest(BaseModel):
    """Request body for updating page code directly."""
    code: str


def sse_event(event_type: str, data: Any) -> str:
    """Format SSE event."""
    json_data = json.dumps(data, ensure_ascii=False)
    return f"event: {event_type}\ndata: {json_data}\n\n"


@router.post("/projects/{project_id}/demo/generate/stream")
async def generate_demo_stream(
    project_id: UUID,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """
    Stream-generate interactive demo using SSE.

    Phase 1: Generate structure (fast)
    Phase 2: Generate pages one by one (streaming)

    SSE Events:
    - init: {total_pages, platforms} - Initial structure
    - page_start: {platform, page_id, page_name} - Starting page generation
    - page_progress: {page_id, chunk} - Code chunk
    - page_complete: {page_id, code} - Page finished
    - complete: {demo_project} - All done
    - error: {message} - Error occurred
    """
    await check_permission(current_user_id, project_id, Permission.GENERATE, db)

    # Verify project exists
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Check if features stage is confirmed
    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .where(Stage.type == "features")
        .order_by(Stage.version.desc())
    )
    features_stage = result.scalars().first()
    if not features_stage or features_stage.status != "confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Features must be confirmed before demo generation",
        )

    async def event_generator():
        agent = InteractiveDemoAgent()

        try:
            # Phase 1: Generate structure
            logger.info(f"[DEMO SSE] Phase 1: Generating structure for project {project_id}")
            structure = await agent.generate_structure(project_id, db)

            # Count total pages
            total_pages = sum(
                len(platform.get("pages", []))
                for platform in structure.get("platforms", [])
            )

            # Send init event
            yield sse_event("init", {
                "total_pages": total_pages,
                "platforms": structure.get("platforms", []),
                "project_name": structure.get("project_name", ""),
                "shared_state": structure.get("shared_state", {}),
            })

            # Get project context for page generation
            context = await agent._get_project_context(project_id, db)

            # Phase 2: Generate each page
            for platform in structure.get("platforms", []):
                platform_type = platform.get("type", "pc")
                context["platform_type"] = platform_type

                for page in platform.get("pages", []):
                    page_id = page.get("id", "")
                    page_name = page.get("name", "")

                    # Send page_start event
                    yield sse_event("page_start", {
                        "platform": platform_type,
                        "page_id": page_id,
                        "page_name": page_name,
                    })

                    # Stream generate page code
                    code_chunks = []
                    try:
                        async for chunk in agent.generate_page_stream(page, context):
                            code_chunks.append(chunk)
                            yield sse_event("page_progress", {
                                "page_id": page_id,
                                "chunk": chunk,
                            })

                        # Combine chunks
                        full_code = "".join(code_chunks)

                        # Clean up code (remove markdown fences if present)
                        full_code = clean_code(full_code)

                        # Update page in structure
                        page["code"] = full_code
                        page["status"] = "completed"

                        yield sse_event("page_complete", {
                            "page_id": page_id,
                            "code": full_code,
                        })

                    except Exception as e:
                        logger.error(f"[DEMO SSE] Error generating page {page_id}: {e}")
                        page["status"] = "error"
                        page["error"] = str(e)
                        yield sse_event("page_error", {
                            "page_id": page_id,
                            "error": str(e),
                        })

            # Save to database
            await save_demo_to_stage(project_id, structure, db)

            # Send complete event
            yield sse_event("complete", {
                "demo_project": structure,
            })

            logger.info(f"[DEMO SSE] Generation complete for project {project_id}")

        except Exception as e:
            logger.error(f"[DEMO SSE] Error: {e}")
            import traceback
            traceback.print_exc()
            yield sse_event("error", {
                "message": str(e),
            })

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/projects/{project_id}/demo/structure")
async def get_demo_structure(
    project_id: UUID,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Get demo structure without code (for quick loading)."""
    await check_permission(current_user_id, project_id, Permission.VIEW, db)

    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .where(Stage.type == "demo")
        .order_by(Stage.version.desc())
    )
    stage = result.scalars().first()

    if not stage or not stage.output_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo not found",
        )

    # Return structure without code
    structure = stage.output_data.copy()
    for platform in structure.get("platforms", []):
        for page in platform.get("pages", []):
            page.pop("code", None)

    return structure


@router.get("/projects/{project_id}/demo/pages/{page_id}")
async def get_demo_page(
    project_id: UUID,
    page_id: str,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Get a single page's code."""
    await check_permission(current_user_id, project_id, Permission.VIEW, db)

    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .where(Stage.type == "demo")
        .order_by(Stage.version.desc())
    )
    stage = result.scalars().first()

    if not stage or not stage.output_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo not found",
        )

    # Find the page
    for platform in stage.output_data.get("platforms", []):
        for page in platform.get("pages", []):
            if page.get("id") == page_id:
                return page

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Page '{page_id}' not found",
    )


@router.post("/projects/{project_id}/demo/pages/{page_id}/regenerate")
async def regenerate_demo_page(
    project_id: UUID,
    page_id: str,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Regenerate a single page with streaming."""
    await check_permission(current_user_id, project_id, Permission.GENERATE, db)

    # Get current demo data
    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .where(Stage.type == "demo")
        .order_by(Stage.version.desc())
    )
    stage = result.scalars().first()

    if not stage or not stage.output_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo not found",
        )

    # Find the page
    page_to_regenerate = None
    platform_type = None
    for platform in stage.output_data.get("platforms", []):
        for page in platform.get("pages", []):
            if page.get("id") == page_id:
                page_to_regenerate = page
                platform_type = platform.get("type", "pc")
                break
        if page_to_regenerate:
            break

    if not page_to_regenerate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Page '{page_id}' not found",
        )

    agent = InteractiveDemoAgent()

    async def event_generator():
        try:
            context = await agent._get_project_context(project_id, db)
            context["platform_type"] = platform_type
            context["shared_state"] = stage.output_data.get("shared_state", {})

            yield sse_event("page_start", {
                "page_id": page_id,
                "page_name": page_to_regenerate.get("name", ""),
            })

            code_chunks = []
            async for chunk in agent.generate_page_stream(page_to_regenerate, context):
                code_chunks.append(chunk)
                yield sse_event("page_progress", {
                    "page_id": page_id,
                    "chunk": chunk,
                })

            full_code = clean_code("".join(code_chunks))

            # Update in stage data
            page_to_regenerate["code"] = full_code
            page_to_regenerate["status"] = "completed"

            # Save to database
            stage.output_data = stage.output_data  # Mark as modified
            await db.commit()

            yield sse_event("page_complete", {
                "page_id": page_id,
                "code": full_code,
            })

        except Exception as e:
            logger.error(f"[DEMO SSE] Regenerate error: {e}")
            yield sse_event("error", {"message": str(e)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/projects/{project_id}/demo/modify")
async def modify_demo_page(
    project_id: UUID,
    request: ModifyRequest,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Modify a page based on natural language instruction with streaming."""
    await check_permission(current_user_id, project_id, Permission.EDIT, db)

    # Get current demo data
    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .where(Stage.type == "demo")
        .order_by(Stage.version.desc())
    )
    stage = result.scalars().first()

    if not stage or not stage.output_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo not found",
        )

    # Find the page
    page_to_modify = None
    for platform in stage.output_data.get("platforms", []):
        for page in platform.get("pages", []):
            if page.get("id") == request.page_id:
                page_to_modify = page
                break
        if page_to_modify:
            break

    if not page_to_modify:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Page '{request.page_id}' not found",
        )

    current_code = page_to_modify.get("code", "")
    if not current_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page has no code to modify",
        )

    agent = InteractiveDemoAgent()

    async def event_generator():
        try:
            yield sse_event("modify_start", {
                "page_id": request.page_id,
                "instruction": request.instruction,
            })

            code_chunks = []
            async for chunk in agent.modify_page_stream(
                instruction=request.instruction,
                current_code=current_code,
                page_info=page_to_modify,
            ):
                code_chunks.append(chunk)
                yield sse_event("modify_progress", {
                    "page_id": request.page_id,
                    "chunk": chunk,
                })

            full_code = clean_code("".join(code_chunks))

            # Update in stage data
            page_to_modify["code"] = full_code

            # Save to database
            stage.output_data = stage.output_data  # Mark as modified
            await db.commit()

            yield sse_event("modify_complete", {
                "page_id": request.page_id,
                "code": full_code,
            })

        except Exception as e:
            logger.error(f"[DEMO SSE] Modify error: {e}")
            yield sse_event("error", {"message": str(e)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/projects/{project_id}/demo/pages/{page_id}/skip")
async def skip_demo_page(
    project_id: UUID,
    page_id: str,
    request: PageSkipRequest,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Mark a page as skipped."""
    await check_permission(current_user_id, project_id, Permission.EDIT, db)

    # Get current demo data
    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .where(Stage.type == "demo")
        .order_by(Stage.version.desc())
    )
    stage = result.scalars().first()

    if not stage or not stage.output_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo not found",
        )

    # Find and update the page
    page_found = False
    for platform in stage.output_data.get("platforms", []):
        for page in platform.get("pages", []):
            if page.get("id") == page_id:
                page["status"] = "skipped"
                if request.reason:
                    page["skip_reason"] = request.reason
                page_found = True
                break
        if page_found:
            break

    if not page_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Page '{page_id}' not found",
        )

    # Save to database
    stage.output_data = stage.output_data  # Mark as modified
    await db.commit()

    return {"status": "success", "page_id": page_id}


@router.put("/projects/{project_id}/demo/pages/{page_id}")
async def update_demo_page(
    project_id: UUID,
    page_id: str,
    request: PageUpdateRequest,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Update page code directly (manual edit)."""
    await check_permission(current_user_id, project_id, Permission.EDIT, db)

    # Get current demo data
    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .where(Stage.type == "demo")
        .order_by(Stage.version.desc())
    )
    stage = result.scalars().first()

    if not stage or not stage.output_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo not found",
        )

    # Find and update the page
    page_found = False
    for platform in stage.output_data.get("platforms", []):
        for page in platform.get("pages", []):
            if page.get("id") == page_id:
                page["code"] = request.code
                page["status"] = "completed"
                page.pop("error", None)  # Clear any previous error
                page_found = True
                break
        if page_found:
            break

    if not page_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Page '{page_id}' not found",
        )

    # Save to database
    stage.output_data = stage.output_data  # Mark as modified
    await db.commit()

    return {"status": "success", "page_id": page_id, "code": request.code}


@router.get("/projects/{project_id}/demo/status")
async def get_demo_status(
    project_id: UUID,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """Get demo generation status statistics."""
    await check_permission(current_user_id, project_id, Permission.VIEW, db)

    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .where(Stage.type == "demo")
        .order_by(Stage.version.desc())
    )
    stage = result.scalars().first()

    if not stage or not stage.output_data:
        return {
            "total": 0,
            "completed": 0,
            "error": 0,
            "skipped": 0,
            "pending": 0,
            "generating": 0,
        }

    # Count pages by status
    stats = {
        "total": 0,
        "completed": 0,
        "error": 0,
        "skipped": 0,
        "pending": 0,
        "generating": 0,
    }

    for platform in stage.output_data.get("platforms", []):
        for page in platform.get("pages", []):
            stats["total"] += 1
            page_status = page.get("status", "pending")
            if page_status in stats:
                stats[page_status] += 1
            else:
                stats["pending"] += 1

    return stats


def clean_code(code: str) -> str:
    """Remove markdown code fences if present."""
    code = code.strip()

    # Remove ```tsx or ```typescript at the start
    if code.startswith("```"):
        first_newline = code.find("\n")
        if first_newline != -1:
            code = code[first_newline + 1:]

    # Remove ``` at the end
    if code.endswith("```"):
        code = code[:-3].rstrip()

    return code


async def save_demo_to_stage(
    project_id: UUID,
    demo_data: dict,
    db: DbSession,
):
    """Save demo data to stage table."""
    # Check if demo stage exists
    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .where(Stage.type == "demo")
        .order_by(Stage.version.desc())
    )
    existing_stage = result.scalars().first()

    if existing_stage:
        existing_stage.output_data = demo_data
        existing_stage.status = "completed"
    else:
        stage = Stage(
            project_id=project_id,
            type="demo",
            status="completed",
            output_data=demo_data,
            version=1,
        )
        db.add(stage)

    # Update project current stage
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one()
    project.current_stage = "demo"

    await db.commit()
