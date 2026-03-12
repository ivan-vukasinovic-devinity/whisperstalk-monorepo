import json
import logging
from typing import Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
router = APIRouter()

connections: Dict[str, WebSocket] = {}


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
            await send_to_user(recipient_id, data)

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("WS error for user %s", user_id)
    finally:
        if connections.get(user_id) is websocket:
            connections.pop(user_id, None)
        logger.info("WS disconnected: %s (total: %d)", user_id, len(connections))
