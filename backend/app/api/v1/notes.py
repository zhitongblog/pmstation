"""Note API routes."""
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import DbSession, CurrentUser, CurrentUserId
from app.core.permissions import Permission, check_permission
from app.models.note import Note
from app.models.stage import Stage
from app.models.user import User
from app.schemas.note import NoteCreate, NoteRead, NoteUpdate, NoteWithUser

router = APIRouter()


@router.get("/stages/{stage_id}/notes", response_model=list[NoteWithUser])
async def list_notes(
    stage_id: UUID,
    current_user_id: CurrentUserId,
    db: DbSession,
):
    """List all notes for a stage."""
    # Get stage to check project permission
    result = await db.execute(
        select(Stage).where(Stage.id == stage_id)
    )
    stage = result.scalar_one_or_none()

    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found",
        )

    await check_permission(current_user_id, stage.project_id, Permission.VIEW, db)

    # Get notes with user info
    result = await db.execute(
        select(Note, User)
        .join(User, Note.user_id == User.id)
        .where(Note.stage_id == stage_id)
        .order_by(Note.created_at.desc())
    )
    rows = result.all()

    notes = []
    for note, user in rows:
        notes.append(
            NoteWithUser(
                id=note.id,
                stage_id=note.stage_id,
                user_id=note.user_id,
                content=note.content,
                created_at=note.created_at,
                updated_at=note.updated_at,
                user_name=user.name,
                user_avatar=user.avatar_url,
            )
        )

    return notes


@router.post("/stages/{stage_id}/notes", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
async def create_note(
    stage_id: UUID,
    note_data: NoteCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Create a note for a stage."""
    # Get stage to check project permission
    result = await db.execute(
        select(Stage).where(Stage.id == stage_id)
    )
    stage = result.scalar_one_or_none()

    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found",
        )

    await check_permission(current_user.id, stage.project_id, Permission.ADD_NOTE, db)

    # Create note
    note = Note(
        stage_id=stage_id,
        user_id=current_user.id,
        content=note_data.content,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    return NoteRead.model_validate(note)


@router.put("/notes/{note_id}", response_model=NoteRead)
async def update_note(
    note_id: UUID,
    note_data: NoteUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Update a note (only by the note author)."""
    result = await db.execute(
        select(Note).where(Note.id == note_id)
    )
    note = result.scalar_one_or_none()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )

    # Only author can edit their own notes
    if note.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own notes",
        )

    note.content = note_data.content
    await db.commit()
    await db.refresh(note)

    return NoteRead.model_validate(note)


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Delete a note (only by the note author)."""
    result = await db.execute(
        select(Note).where(Note.id == note_id)
    )
    note = result.scalar_one_or_none()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )

    # Only author can delete their own notes
    if note.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own notes",
        )

    await db.delete(note)
    await db.commit()
