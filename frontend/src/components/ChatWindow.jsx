import { useEffect, useRef, useState } from "react";

export function ChatWindow({
  contact,
  wsConnected = false,
  messages,
  onSend,
  onRetry,
  onDeleteMessages,
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
            className={`encryption-toggle-btn ${encrypted ? "encrypted" : ""}`}
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
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2.5" ry="2.5"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                <circle cx="12" cy="16.5" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2.5" ry="2.5"/>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
              </svg>
            )}
          </button>
          {messages.length > 0 && (
            <button
              className="icon-action delete-messages-btn"
              onClick={() => { if (window.confirm("Delete all messages in this chat?")) onDeleteMessages?.(); }}
              aria-label="Delete all messages"
              title="Delete all messages"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/>
                <path d="M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          )}
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
          messages.map((message) => {
            const isFailed = message.me && message.status === "failed";
            const isSending = message.me && message.status === "sending";
            return (
              <div
                key={message.id}
                className={`bubble ${message.me ? "me" : "peer"} ${message.decryptFailed ? "decrypt-failed" : ""} ${isFailed ? "failed" : ""}`}
                onClick={isFailed && onRetry ? () => onRetry(message) : undefined}
                role={isFailed ? "button" : undefined}
                tabIndex={isFailed ? 0 : undefined}
              >
                <div>{message.decryptFailed ? "🔒 Unable to decrypt" : message.text}</div>
                <small>
                  {message.me
                    ? isSending
                      ? "sending..."
                      : isFailed
                        ? "failed — tap to retry"
                        : `sent · ${new Date(message.sentAt || message.createdAt).toLocaleTimeString()}`
                    : new Date(message.createdAt).toLocaleTimeString()}
                  {message.encrypted ? " · 🔒" : ""}
                </small>
              </div>
            );
          })
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
