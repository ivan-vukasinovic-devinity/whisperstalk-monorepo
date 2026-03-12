import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiClient } from "./api/client";
import { ChatWindow } from "./components/ChatWindow";
import { ContactList } from "./components/ContactList";
import { QRCodeCard } from "./components/QRCodeCard";
import { ScanAddContact } from "./components/ScanAddContact";
import { useEphemeralMessages } from "./hooks/useEphemeralMessages";
import { useWhisperSocket } from "./hooks/useWhisperSocket";
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
  const [nudgeFromSet, setNudgeFromSet] = useState(new Set());
  const [feedback, setFeedback] = useState("");
  const [activeScreen, setActiveScreen] = useState("contacts");
  const connectionStateRef = useRef("disconnected");
  const p2pRef = useRef(null);
  const activeContactRef = useRef(null);
  const [inviteToken, setInviteToken] = useState(() => localStorage.getItem(INVITE_TOKEN_STORAGE_KEY) || "");

  const conversationKey = useMemo(() => {
    if (!identity || !activeContact) return null;
    return [identity.id, activeContact.contact_user_id].sort().join("_");
  }, [identity, activeContact]);

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

  useEffect(() => {
    activeContactRef.current = activeContact;
  }, [activeContact]);

  const handleWsMessage = useCallback((data) => {
    const { type, sender_id } = data;

    if (type === "signal") {
      const current = activeContactRef.current;
      if (current && sender_id === current.contact_user_id && p2pRef.current) {
        p2pRef.current.handleSignal(data).catch(() => {});
      }
      return;
    }

    if (type === "nudge") {
      setNudgeFromSet((prev) => {
        const next = new Set(prev);
        next.add(sender_id);
        return next;
      });
      return;
    }

    if (type === "contact_update") {
      if (identity) {
        refreshContactsAndPending(identity.id).catch(() => {});
      }
    }
  }, [identity]);

  const { send: wsSend } = useWhisperSocket(identity?.id, handleWsMessage);

  async function refreshContactsAndPending(userId) {
    const [contactsData, pendingData] = await Promise.all([
      apiClient.getContacts(userId),
      apiClient.getPendingRequests(userId),
    ]);
    setContacts(contactsData);
    setPending(pendingData);
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

  async function sendContactRequestByIdentifier(identifier) {
    if (!identity) return;
    try {
      await apiClient.createContactRequestByIdentifier(identity.id, identifier);
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

  async function rejectRequest(requestId) {
    if (!identity) return;
    try {
      await apiClient.rejectContactRequest(requestId, identity.id);
      await refreshContactsAndPending(identity.id);
      setFeedback("Request declined.");
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
  }, [identity]);

  useEffect(() => {
    if (!identity || activeScreen !== "contacts") return;
    refreshContactsAndPending(identity.id).catch(() => {});
  }, [activeScreen]);

  useEffect(() => {
    if (identity && inviteToken) {
      setFeedback("Invite link detected. Review token in Add Contact and send request.");
    }
  }, [identity, inviteToken]);

  useEffect(() => {
    function scrollComposerIntoView(event) {
      if (
        !(event.target instanceof HTMLElement) ||
        !event.target.matches(".composer-input")
      )
        return;
      setTimeout(() => {
        event.target.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 300);
    }
    document.addEventListener("focusin", scrollComposerIntoView);
    return () => document.removeEventListener("focusin", scrollComposerIntoView);
  }, []);


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

    wsSend({ type: "nudge", recipient_id: remoteUserId });
    setNudgeFromSet((prev) => {
      if (!prev.has(remoteUserId)) return prev;
      const next = new Set(prev);
      next.delete(remoteUserId);
      return next;
    });

    function sendSignalViaWs(signalPayload) {
      const sent = wsSend({
        type: "signal",
        recipient_id: signalPayload.recipient_id,
        message_type: signalPayload.message_type,
        payload: signalPayload.payload,
      });
      if (!sent) {
        return apiClient.sendSignal(signalPayload);
      }
      return Promise.resolve();
    }

    const session = createP2PSession({
      localUserId: identity.id,
      remoteUserId,
      initiator,
      sendSignal: sendSignalViaWs,
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

    const renegotiateId = setInterval(() => {
      if (!initiator) return;
      if (connectionStateRef.current === "connected") return;
      session.startOffer({ iceRestart: true }).catch(() => {});
    }, 6000);

    return () => {
      clearInterval(renegotiateId);
      if (p2pRef.current) {
        p2pRef.current.destroy();
        p2pRef.current = null;
      }
      setConnectionState("disconnected");
      connectionStateRef.current = "disconnected";
    };
  }, [identity, activeContact, addMessage, wsSend]);

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
      setFeedback("Peer is not connected yet. Message queued and will send on reconnect.");
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
                  <button className="icon-action" onClick={() => setActiveScreen("add-contact")} aria-label="Add contact">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
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
                nudgeFromSet={nudgeFromSet}
              />

              {pending.length > 0 ? (
                <section className="panel pending-panel">
                  <h3>Pending Requests ({pending.length})</h3>
                  {pending.map((request) => (
                    <div key={request.id} className="pending-request-card">
                      <div className="pending-request-info">
                        <span className="pending-username">{request.requester_username}</span>
                        <span className="pending-id mono">{request.requester_id.slice(0, 12)}...</span>
                        <span className="pending-time muted">
                          {new Date(request.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          {" "}
                          {new Date(request.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="pending-request-actions">
                        <button className="btn small" onClick={() => acceptRequest(request.id)}>Accept</button>
                        <button className="btn small ghost" onClick={() => rejectRequest(request.id)}>Decline</button>
                      </div>
                    </div>
                  ))}
                </section>
              ) : null}

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
                messages={messages}
                onSend={sendMessage}
                showBack={true}
                onBack={() => setActiveScreen("contacts")}
                feedback={feedback}
              />
            </section>
          ) : null}

          {activeScreen === "add-contact" ? (
            <section className="settings-screen">
              <header className="settings-header">
                <button className="icon-action back-arrow" onClick={() => setActiveScreen("contacts")} aria-label="Back to contacts">
                  ←
                </button>
                <h2>Add Contact</h2>
              </header>

              <ScanAddContact
                userId={identity.id}
                onSubmitQr={sendContactRequest}
                onSubmitIdentifier={sendContactRequestByIdentifier}
                initialInviteValue={inviteToken}
              />
              <QRCodeCard user={identity} />
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
