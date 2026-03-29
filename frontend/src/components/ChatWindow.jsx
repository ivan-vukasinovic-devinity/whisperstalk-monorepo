import { useEffect, useRef, useState } from "react";

export function ChatWindow({
  contact,
  wsConnected = false,
  messages,
  onSend,
  showBack = false,
  onBack = null,
  feedback = "",
  encrypted = false,
  onSetPasscode,
  onClearPasscode,
}) {
  const [text, setText] = useState("");
  const [showPasscodeInput, setShowPasscodeInput] = useState(false);
  const [passcodeValue, setPasscodeValue] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const statusLabel = wsConnected ? "connected" : "reconnecting";
  const statusDotClass = wsConnected ? "green" : "yellow";

  if (!contact) {
    return (
      <section className="panel chat-window">
        <div className="chat-empty">
          <p className="empty-title">SELECT A CONTACT</p>
          <p className="muted">or scan a QR code to add one</p>
        </div>
      </section>
    );
  }

  function handlePasscodeSubmit() {
    const code = passcodeValue.trim();
    if (!code) return;
    onSetPasscode?.(code);
    setPasscodeValue("");
    setShowPasscodeInput(false);
  }

  return (
    <section className="panel chat-window">
      <div className="chat-header">
        <div className="chat-title-wrap">
          {showBack && onBack ? (
            <button className="icon-action back-arrow" onClick={onBack} aria-label="Back">
              ←
            </button>
          ) : null}
          <div>
            <h3>{contact.alias || contact.display_name}</h3>
            <p className="muted expire-label">messages expire in 12h</p>
          </div>
        </div>
        {feedback ? <p className="header-feedback">{feedback}</p> : null}
        <div className="chat-header-actions">
          <button
            className={`icon-action encryption-toggle ${encrypted ? "encrypted" : ""}`}
            onClick={() => {
              if (encrypted) {
                onClearPasscode?.();
              } else {
                setShowPasscodeInput((v) => !v);
              }
            }}
            aria-label={encrypted ? "Disable encryption" : "Enable encryption"}
            title={encrypted ? "Encrypted — tap to disable" : "Not encrypted — tap to set passcode"}
          >
            {encrypted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
              </svg>
            )}
          </button>
          <span className={`status-pill ${wsConnected ? "online" : ""}`}>
            <span className={`dot ${statusDotClass}`} />
            {statusLabel}
          </span>
        </div>
      </div>

      {showPasscodeInput ? (
        <div className="passcode-bar">
          <input
            className="text-input passcode-input"
            type="password"
            placeholder="enter shared passcode..."
            value={passcodeValue}
            autoFocus
            onChange={(e) => setPasscodeValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handlePasscodeSubmit(); }}
          />
          <button className="btn small" disabled={!passcodeValue.trim()} onClick={handlePasscodeSubmit}>
            Lock
          </button>
          <button className="btn small ghost" onClick={() => { setShowPasscodeInput(false); setPasscodeValue(""); }}>
            Cancel
          </button>
        </div>
      ) : null}

      {encrypted ? (
        <div className="encryption-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          End-to-end encrypted
        </div>
      ) : null}

      <div className="messages">
        {messages.length === 0 ? (
          <p className="muted">No messages in the last 12h.</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`bubble ${message.me ? "me" : "peer"} ${message.decryptFailed ? "decrypt-failed" : ""}`}>
              <div>{message.decryptFailed ? "🔒 Unable to decrypt" : message.text}</div>
              <small>
                {message.me
                  ? message.status === "pending"
                    ? "queued"
                    : `sent · ${new Date(message.sentAt || message.createdAt).toLocaleTimeString()}`
                  : new Date(message.createdAt).toLocaleTimeString()}
                {message.encrypted ? " · 🔒" : ""}
              </small>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="composer">
        <span className="prompt">{encrypted ? "🔒" : ">"}</span>
        <input
          className="text-input composer-input"
          value={text}
          placeholder={encrypted ? "encrypted message..." : "type a message..."}
          enterKeyHint="send"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && text.trim()) {
              onSend(text.trim());
              setText("");
            }
          }}
        />
        <button
          className="btn icon-btn"
          disabled={!text.trim()}
          onClick={() => {
            onSend(text.trim());
            setText("");
          }}
        >
          ➤
        </button>
      </div>
    </section>
  );
}
