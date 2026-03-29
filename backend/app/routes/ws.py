import json
import logging
from typing import Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import delete, select

from app.db import SessionLocal
from app.models.pending_message import PendingMessage

logger = logging.getLogger(__name__)
router = APIRouter()

connections: Dict[str, WebSocket] = {}

STORE_TYPES = {"chat", "nudge"}


def _store_pending(sender_id: str, recipient_id: str, message: dict) -> None:
    """Persist a message for later delivery (sync, runs in background)."""
    db = SessionLocal()
    try:
        row = PendingMessage(
            sender_id=sender_id,
            recipient_id=recipient_id,
            payload=json.dumps(message),
            encrypted=message.get("encrypted", False),
        )
        db.add(row)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to store pending message for %s", recipient_id)
    finally:
        db.close()


def _fetch_and_delete_pending(user_id: str) -> list[dict]:
    """Retrieve all pending messages for a user and delete them."""
    db = SessionLocal()
    try:
        rows = (
            db.execute(
                select(PendingMessage)
                .where(PendingMessage.recipient_id == user_id)
                .order_by(PendingMessage.created_at)
            )
            .scalars()
            .all()
        )
        messages = []
        ids_to_delete = []
        for row in rows:
            try:
                messages.append(json.loads(row.payload))
            except json.JSONDecodeError:
                pass
            ids_to_delete.append(row.id)

        if ids_to_delete:
            db.execute(
                delete(PendingMessage).where(PendingMessage.id.in_(ids_to_delete))
            )
            db.commit()

        return messages
    except Exception:
        db.rollback()
        logger.exception("Failed to fetch pending messages for %s", user_id)
        return []
    finally:
        db.close()


async def send_to_user(user_id: str, message: dict) -> bool:
    """Send a JSON message to a connected user. Returns True if delivered."""
    ws = connections.get(user_id)
    if not ws:
        return False
    try:
        await ws.send_json(message)
        return True
    except Exception:
        connections.pop(user_id, None)
        return False


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()

    old = connections.pop(user_id, None)
    if old:
        try:
            await old.close(code=4001, reason="replaced")
        except Exception:
            pass

    connections[user_id] = websocket
    logger.info("WS connected: %s (total: %d)", user_id, len(connections))

    pending = _fetch_and_delete_pending(user_id)
    for msg in pending:
        try:
            await websocket.send_json(msg)
        except Exception:
            break

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")
            recipient_id = data.get("recipient_id")

            if not msg_type or not recipient_id:
                continue

            data["sender_id"] = user_id

            delivered = await send_to_user(recipient_id, data)

            if not delivered and msg_type in STORE_TYPES:
                _store_pending(user_id, recipient_id, data)

            if msg_type == "chat":
                await websocket.send_json(
                    {"type": "ack", "id": data.get("id"), "delivered": delivered}
                )

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("WS error for user %s", user_id)
    finally:
        if connections.get(user_id) is websocket:
            connections.pop(user_id, None)
        logger.info("WS disconnected: %s (total: %d)", user_id, len(connections))
