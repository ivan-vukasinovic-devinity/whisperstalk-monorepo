import { useEffect, useMemo, useRef, useState } from "react";

import { apiClient } from "./api/client";
import { ChatWindow } from "./components/ChatWindow";
import { ContactList } from "./components/ContactList";
import { QRCodeCard } from "./components/QRCodeCard";
import { ScanAddContact } from "./components/ScanAddContact";
import { useEphemeralMessages } from "./hooks/useEphemeralMessages";
import { createP2PSession } from "./p2p/webrtc";

const SESSION_STORAGE_KEY = "whispers_identity";
const INVITE_TOKEN_STORAGE_KEY = "whispers_pending_invite_token";

export default function App() {
  const [identity, setIdentity] = useState(() => {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  });
  const [authMode, setAuthMode] = useState("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [contacts, setContacts] = useState([]);
  const [pending, setPending] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [connectionState, setConnectionState] = useState("disconnected");
  const [presenceByUserId, setPresenceByUserId] = useState({});
  const [feedback, setFeedback] = useState("");
  const [activeScreen, setActiveScreen] = useState("contacts");
  const connectionStateRef = useRef("disconnected");
  const activePeerOnlineRef = useRef(false);
  const p2pRef = useRef(null);
  const [inviteToken, setInviteToken] = useState(() => localStorage.getItem(INVITE_TOKEN_STORAGE_KEY) || "");

  const conversationKey = useMemo(() => {
    if (!identity || !activeContact) return null;
    return [identity.id, activeContact.contact_user_id].sort().join("_");
  }, [identity, activeContact]);
  const activePeerOnline = activeContact ? !!presenceByUserId[activeContact.contact_user_id] : false;

  const { messages, addMessage, updateMessage } = useEphemeralMessages(conversationKey);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("inviteToken") || params.get("token") || "";
    if (!tokenFromUrl) return;

    setInviteToken(tokenFromUrl);
    localStorage.setItem(INVITE_TOKEN_STORAGE_KEY, tokenFromUrl);
    params.delete("inviteToken");
    params.delete("token");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, []);

  useEffect(() => {
    if (!identity) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(identity));
  }, [identity]);

  async function refreshContactsAndPending(userId) {
    const [contactsData, pendingData] = await Promise.all([
      apiClient.getContacts(userId),
      apiClient.getPendingRequests(userId)
    ]);
    setContacts(contactsData);
    setPending(pendingData);
    if (contactsData.length === 0) {
      setPresenceByUserId({});
      return;
    }
    try {
      const statuses = await apiClient.getPresenceStatuses(contactsData.map((item) => item.contact_user_id));
      setPresenceByUserId(
        statuses.reduce((acc, item) => {
          acc[item.user_id] = item.is_online;
          return acc;
        }, {})
      );
    } catch (_) {
      // Presence indicators are best effort and should not block primary data loading.
    }
  }

  async function authenticate() {
    try {
      const payload = { username: username.trim(), password };
      const user = authMode === "signup" ? await apiClient.signup(payload) : await apiClient.login(payload);
      setIdentity(user);
      setActiveScreen("contacts");
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
      if (inviteToken && token === inviteToken) {
        setInviteToken("");
        localStorage.removeItem(INVITE_TOKEN_STORAGE_KEY);
      }
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
    refreshContactsAndPending(identity.id).catch(() => {
      setFeedback("Session is stale. Please log in again.");
      setIdentity(null);
    });
    const id = setInterval(() => refreshContactsAndPending(identity.id).catch(() => {}), 5000);
    return () => clearInterval(id);
  }, [identity]);

  useEffect(() => {
    if (!identity) return undefined;
    const run = () => apiClient.heartbeat(identity.id).catch(() => {});
    run();
    const id = setInterval(run, 4000);
    return () => clearInterval(id);
  }, [identity]);

  useEffect(() => {
    if (identity && inviteToken) {
      setFeedback("Invite link detected. Review token in Add Contact and send request.");
    }
  }, [identity, inviteToken]);

  useEffect(() => {
    activePeerOnlineRef.current = activePeerOnline;
  }, [activePeerOnline]);

  useEffect(() => {
    if (!identity || !activeContact) return;
    setConnectionState("connecting");
    connectionStateRef.current = "connecting";

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
      onStateChange: (nextState) => {
        connectionStateRef.current = nextState;
        setConnectionState(nextState);
      }
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

    const renegotiateId = setInterval(() => {
      if (!initiator) return;
      if (!activePeerOnlineRef.current) return;
      if (connectionStateRef.current === "connected") return;
      session.startOffer({ iceRestart: true }).catch(() => {});
    }, 5000);

    return () => {
      clearInterval(pollId);
      clearInterval(renegotiateId);
      if (p2pRef.current) {
        p2pRef.current.destroy();
        p2pRef.current = null;
      }
      setConnectionState("disconnected");
      connectionStateRef.current = "disconnected";
    };
  }, [identity, activeContact, addMessage]);

  useEffect(() => {
    if (!activeContact || connectionState !== "connected" || !p2pRef.current) return;
    const unsentMine = messages
      .filter((item) => item.me && item.status === "sending")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const message of unsentMine) {
      try {
        p2pRef.current.sendText(message.text);
        updateMessage(message.id, {
          status: "sent",
          sentAt: new Date().toISOString()
        });
      } catch (_) {
        break;
      }
    }
  }, [activeContact, connectionState, messages, updateMessage]);

  function sendMessage(text) {
    if (!activeContact) return;
    const messageId = crypto.randomUUID();
    addMessage({
      id: messageId,
      text,
      me: true,
      createdAt: new Date().toISOString(),
      status: "sending",
      sentAt: null
    });

    if (p2pRef.current && connectionState === "connected") {
      try {
        p2pRef.current.sendText(text);
        updateMessage(messageId, {
          status: "sent",
          sentAt: new Date().toISOString()
        });
      } catch (_) {
        setFeedback("Peer is not connected to chat yet. Message queued and will send on reconnect.");
      }
    } else {
      setFeedback(
        activePeerOnline
          ? "Peer is online but not connected to this chat yet. Message queued."
          : "Peer is offline. Message queued and will send on reconnect."
      );
    }
  }

  function logout() {
    setIdentity(null);
    setActiveContact(null);
    setConnectionState("disconnected");
    setActiveScreen("contacts");
    setFeedback("Logged out.");
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
        <section className="mobile-app-shell">
          {activeScreen === "contacts" ? (
            <section className="contacts-screen">
              <header className="contacts-header">
                <div className="brand-inline">
                  <span className="brand-icon">◯</span>
                  <h2>WhisperTalk</h2>
                </div>
                <div className="contacts-header-actions">
                  <button className="icon-action" onClick={() => setActiveScreen("settings")} aria-label="Open settings">
                    ⚙
                  </button>
                </div>
              </header>

              <div className="contacts-identity">$ {identity.username}</div>
              <ContactList
                contacts={contacts}
                activeContactId={activeContact?.contact_user_id}
                onSelect={(contact) => {
                  setActiveContact(contact);
                  setActiveScreen("chat");
                }}
                presenceByUserId={presenceByUserId}
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

              <footer className="screen-footer">
                <span className="sidebar-footnote">E2E ENCRYPTED • P2P</span>
                <button className="icon-action" onClick={() => setActiveScreen("settings")} aria-label="Open settings">
                  ⚙
                </button>
              </footer>
            </section>
          ) : null}

          {activeScreen === "chat" ? (
            <section className="chat-screen">
              <ChatWindow
                contact={activeContact}
                connectionState={connectionState}
                peerOnline={activePeerOnline}
                messages={messages}
                onSend={sendMessage}
                showBack={true}
                onBack={() => setActiveScreen("contacts")}
                feedback={feedback}
              />
            </section>
          ) : null}

          {activeScreen === "settings" ? (
            <section className="settings-screen">
              <header className="settings-header">
                <button className="icon-action back-arrow" onClick={() => setActiveScreen("contacts")} aria-label="Back to contacts">
                  ←
                </button>
                <h2>SETTINGS</h2>
              </header>

              <section className="panel settings-identity-card">
                <h3>Username</h3>
                <div className="settings-identity-row">
                  <strong>{identity.username}</strong>
                </div>
              </section>

              <QRCodeCard user={identity} />
              <ScanAddContact userId={identity.id} onSubmit={sendContactRequest} initialInviteValue={inviteToken} />

              <section className="panel settings-actions-card">
                <button className="btn ghost full-width-btn" onClick={logout}>
                  Sign Out
                </button>
              </section>

              <section className="panel danger-panel">
                <h3>Danger Zone</h3>
                <p className="muted">This action is not available in this build.</p>
                <button className="btn danger-btn full-width-btn" disabled>
                  Clear All Data
                </button>
              </section>
            </section>
          ) : null}
        </section>
      )}

      {!identity && feedback ? <p className="feedback">{feedback}</p> : null}
    </main>
  );
}
