import json
import logging
from collections import defaultdict
from typing import Dict, List

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.utils.security import decode_access_token

logger = logging.getLogger(__name__)
router = APIRouter()

connections: Dict[str, WebSocket] = {}
pending: Dict[str, List[dict]] = defaultdict(list)

STORE_TYPES = {"chat", "nudge"}


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
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return
    try:
        payload = decode_access_token(token)
        token_user_id = payload["sub"]
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError) as exc:
        await websocket.accept()
        await websocket.close(code=4001, reason=str(exc))
        return

    if token_user_id != user_id:
        await websocket.accept()
        await websocket.close(code=4001, reason="Token user mismatch")
        return

    await websocket.accept()

    old = connections.pop(user_id, None)
    if old:
        try:
            await old.close(code=4001, reason="replaced")
        except Exception:
            pass

    connections[user_id] = websocket
    logger.info("WS connected: %s (total: %d)", user_id, len(connections))

    queued = pending.pop(user_id, [])
    for msg in queued:
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
                pending[recipient_id].append(data)

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
