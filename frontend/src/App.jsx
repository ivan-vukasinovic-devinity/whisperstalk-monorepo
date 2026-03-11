import { useEffect, useMemo, useRef, useState } from "react";

import { apiClient } from "./api/client";
import { ChatWindow } from "./components/ChatWindow";
import { ContactList } from "./components/ContactList";
import { QRCodeCard } from "./components/QRCodeCard";
import { ScanAddContact } from "./components/ScanAddContact";
import { useEphemeralMessages } from "./hooks/useEphemeralMessages";
import { createP2PSession } from "./p2p/webrtc";

export default function App() {
  const [identity, setIdentity] = useState(null);
  const [authMode, setAuthMode] = useState("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [contacts, setContacts] = useState([]);
  const [pending, setPending] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [connectionState, setConnectionState] = useState("disconnected");
  const [feedback, setFeedback] = useState("");
  const p2pRef = useRef(null);
  const inviteTokenFromUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("inviteToken") || params.get("token") || "";
  }, []);

  const conversationKey = useMemo(() => {
    if (!identity || !activeContact) return null;
    return [identity.id, activeContact.contact_user_id].sort().join("_");
  }, [identity, activeContact]);

  const { messages, addMessage } = useEphemeralMessages(conversationKey);

  async function refreshContactsAndPending(userId) {
    const [contactsData, pendingData] = await Promise.all([
      apiClient.getContacts(userId),
      apiClient.getPendingRequests(userId)
    ]);
    setContacts(contactsData);
    setPending(pendingData);
  }

  async function authenticate() {
    try {
      const payload = { username: username.trim(), password };
      const user = authMode === "signup" ? await apiClient.signup(payload) : await apiClient.login(payload);
      setIdentity(user);
      setFeedback(authMode === "signup" ? "Account created. Share your QR code." : "Logged in.");
      await refreshContactsAndPending(user.id);
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function sendContactRequest(token) {
    if (!identity) return;
    try {
      await apiClient.createContactRequest({ requester_id: identity.id, target_qr_token: token });
      setFeedback("Contact request sent.");
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function acceptRequest(requestId) {
    if (!identity) return;
    try {
      await apiClient.acceptContactRequest(requestId, identity.id);
      await refreshContactsAndPending(identity.id);
      setFeedback("Request accepted.");
    } catch (error) {
      setFeedback(error.message);
    }
  }

  useEffect(() => {
    if (!identity) return;
    const id = setInterval(() => refreshContactsAndPending(identity.id).catch(() => {}), 5000);
    return () => clearInterval(id);
  }, [identity]);

  useEffect(() => {
    if (identity && inviteTokenFromUrl) {
      setFeedback("Invite link detected. Review token in Add Contact and send request.");
    }
  }, [identity, inviteTokenFromUrl]);

  useEffect(() => {
    if (!identity || !activeContact) return;

    if (p2pRef.current) {
      p2pRef.current.destroy();
      p2pRef.current = null;
    }

    const remoteUserId = activeContact.contact_user_id;
    const initiator = identity.id < remoteUserId;
    const session = createP2PSession({
      localUserId: identity.id,
      remoteUserId,
      initiator,
      sendSignal: apiClient.sendSignal,
      onDataMessage: (text) => {
        addMessage({ id: crypto.randomUUID(), text, me: false, createdAt: new Date().toISOString() });
      },
      onStateChange: setConnectionState
    });
    p2pRef.current = session;

    if (initiator) {
      session.startOffer().catch((error) => setFeedback(error.message));
    }

    const pollId = setInterval(async () => {
      try {
        const inbox = await apiClient.consumeSignals(identity.id, remoteUserId);
        for (const signal of inbox) {
          await session.handleSignal(signal);
        }
      } catch (_) {
        // Silent polling retries keep reconnection simple for MVP.
      }
    }, 1200);

    return () => {
      clearInterval(pollId);
      if (p2pRef.current) {
        p2pRef.current.destroy();
        p2pRef.current = null;
      }
      setConnectionState("disconnected");
    };
  }, [identity, activeContact, addMessage]);

  function sendMessage(text) {
    if (!p2pRef.current) {
      setFeedback("Not connected to peer yet.");
      return;
    }
    try {
      p2pRef.current.sendText(text);
      addMessage({ id: crypto.randomUUID(), text, me: true, createdAt: new Date().toISOString() });
    } catch (error) {
      setFeedback(error.message);
    }
  }

  return (
    <main className="app-shell">
      {!identity ? (
        <section className="auth-screen">
          <div className="auth-card">
            <div className="brand-block">
              <h1>WhisperTalk</h1>
              <p>Private messaging</p>
            </div>

            <div className="auth-toggle">
              <button className={`btn small ${authMode === "signup" ? "" : "ghost"}`} onClick={() => setAuthMode("signup")}>
                Sign Up
              </button>
              <button className={`btn small ${authMode === "login" ? "" : "ghost"}`} onClick={() => setAuthMode("login")}>
                Login
              </button>
            </div>

            <label className="field-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="text-input"
              placeholder="Enter username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="text-input"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button className="btn auth-submit" disabled={!username.trim() || password.length < 8} onClick={authenticate}>
              {authMode === "signup" ? "Create Account" : "Sign In"}
            </button>
            <p className="auth-footnote">E2E ENCRYPTED • P2P</p>
          </div>
        </section>
      ) : (
        <section className="chat-layout">
          <aside className="sidebar">
            <div className="sidebar-header">
              <div>
                <h2>WhisperTalk</h2>
                <p className="identity-line">$ {identity.username}_</p>
              </div>
              <button className="btn small ghost" onClick={() => setIdentity(null)}>
                Logout
              </button>
            </div>

            <ContactList
              contacts={contacts}
              activeContactId={activeContact?.contact_user_id}
              onSelect={setActiveContact}
            />

            <section className="panel pending-panel">
              <h3>Pending Requests</h3>
              {pending.length === 0 ? (
                <p className="muted">No pending requests.</p>
              ) : (
                pending.map((request) => (
                  <div key={request.id} className="row">
                    <span className="mono">{request.requester_id.slice(0, 8)}...</span>
                    <button className="btn small" onClick={() => acceptRequest(request.id)}>
                      Accept
                    </button>
                  </div>
                ))
              )}
            </section>

            <QRCodeCard user={identity} />
            <ScanAddContact
              userId={identity.id}
              onSubmit={sendContactRequest}
              initialInviteValue={inviteTokenFromUrl}
            />
            <p className="sidebar-footnote">E2E ENCRYPTED • P2P</p>
          </aside>

          <section className="chat-pane">
            <ChatWindow
              contact={activeContact}
              connectionState={connectionState}
              messages={messages}
              onSend={sendMessage}
            />
          </section>
        </section>
      )}

      {feedback ? <p className="feedback">{feedback}</p> : null}
    </main>
  );
}
