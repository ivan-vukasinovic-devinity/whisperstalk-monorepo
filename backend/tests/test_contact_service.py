from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db import Base
from app.services.contact_service import accept_contact_request, create_contact_request, list_contacts_for_user
from app.services.user_service import create_user


def make_test_db() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    return TestingSession()


def test_request_accept_creates_bidirectional_contacts() -> None:
    db = make_test_db()
    alice = create_user(db, username="alice", password="password123", device_label="Alice Laptop")
    bob = create_user(db, username="bob", password="password123", device_label="Bob Phone")

    req = create_contact_request(db, requester_id=alice.id, target_qr_token=bob.qr_token)
    accept_contact_request(db, request_id=req.id, user_id=bob.id)

    alice_contacts = list_contacts_for_user(db, alice.id)
    bob_contacts = list_contacts_for_user(db, bob.id)

    assert len(alice_contacts) == 1
    assert len(bob_contacts) == 1
    assert alice_contacts[0]["contact_user_id"] == bob.id
    assert bob_contacts[0]["contact_user_id"] == alice.id
