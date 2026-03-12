import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiClient } from "./api/client";
import { ChatWindow } from "./components/ChatWindow";
import { ContactList } from "./components/ContactList";
import { QRCodeCard } from "./components/QRCodeCard";
import { ScanAddContact } from "./components/ScanAddContact";
import { useEphemeralMessages } from "./hooks/useEphemeralMessages";
import { useWhisperSocket } from "./hooks/useWhisperSocket";

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
  const [nudgeFromSet, setNudgeFromSet] = useState(new Set());
  const [feedback, setFeedback] = useState("");
  const [activeScreen, setActiveScreen] = useState("contacts");
  const activeContactRef = useRef(null);
  const [inviteToken, setInviteToken] = useState(() => localStorage.getItem(INVITE_TOKEN_STORAGE_KEY) || "");

  const conversationKey = useMemo(() => {
    if (!identity || !activeContact) return null;
    return [identity.id, activeContact.contact_user_id].sort().join("_");
  }, [identity, activeContact]);

  const { messages, addMessage } = useEphemeralMessages(conversationKey);

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

    if (type === "chat") {
      if (!identity) return;
      const msg = { id: data.id || crypto.randomUUID(), text: data.text, me: false, createdAt: new Date().toISOString() };
      const current = activeContactRef.current;

      if (current && sender_id === current.contact_user_id) {
        addMessage(msg);
      } else {
        const convKey = [identity.id, sender_id].sort().join("_");
        const storeKey = `whispers_msgs_${convKey}`;
        try {
          const existing = JSON.parse(localStorage.getItem(storeKey) || "[]");
          existing.push(msg);
          localStorage.setItem(storeKey, JSON.stringify(existing));
        } catch (_) { /* storage full or corrupt — non-fatal */ }
        setNudgeFromSet((prev) => {
          const next = new Set(prev);
          next.add(sender_id);
          return next;
        });
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
  }, [identity, addMessage]);

  const { send: wsSend, connected: wsConnected } = useWhisperSocket(identity?.id, handleWsMessage);

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
    const remoteUserId = activeContact.contact_user_id;
    wsSend({ type: "nudge", recipient_id: remoteUserId });
    setNudgeFromSet((prev) => {
      if (!prev.has(remoteUserId)) return prev;
      const next = new Set(prev);
      next.delete(remoteUserId);
      return next;
    });
  }, [identity, activeContact, wsSend]);

  function sendMessage(text) {
    if (!activeContact) return;
    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();

    const sent = wsSend({
      type: "chat",
      recipient_id: activeContact.contact_user_id,
      id: messageId,
      text,
    });

    addMessage({
      id: messageId,
      text,
      me: true,
      createdAt: now,
      status: sent ? "sent" : "failed",
      sentAt: sent ? now : null,
    });

    if (!sent) {
      setFeedback("Not connected to server. Check your connection.");
    }
  }

  function logout() {
    setIdentity(null);
    setActiveContact(null);
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
            <p className="auth-footnote">PRIVATE MESSAGING</p>
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
                <span className="sidebar-footnote">PRIVATE MESSAGING</span>
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
                wsConnected={wsConnected}
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
