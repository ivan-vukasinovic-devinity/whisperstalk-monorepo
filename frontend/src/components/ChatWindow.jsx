import { useState } from "react";

export function ChatWindow({
  contact,
  connectionState,
  peerOnline = false,
  messages,
  onSend,
  showBack = false,
  onBack = null,
  feedback = ""
}) {
  const [text, setText] = useState("");
  const statusLabel =
    connectionState === "connected" ? "connected" : peerOnline ? "online" : "offline";
  const statusDotClass =
    connectionState === "connected" ? "green" : peerOnline ? "yellow" : "red";

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

  return (
    <section className="panel chat-window">
      <div className="chat-header">
        <div>
          <h3>{contact.alias || contact.display_name}</h3>
          <p className="muted expire-label">messages expire in 12h</p>
        </div>
        {feedback ? <p className="header-feedback">{feedback}</p> : null}
        <div className="chat-header-actions">
          <span className={`status-pill ${connectionState === "connected" ? "online" : ""}`}>
            <span className={`dot ${statusDotClass}`} />
            {statusLabel}
          </span>
          {showBack && onBack ? (
            <button className="btn small ghost back-btn" onClick={onBack}>
              Back
            </button>
          ) : null}
        </div>
      </div>
      <div className="messages">
        {messages.length === 0 ? (
          <p className="muted">No messages in the last 12h.</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`bubble ${message.me ? "me" : "peer"}`}>
              <div>{message.text}</div>
              <small>
                {message.me
                  ? message.status === "sending"
                    ? "sending"
                    : `sent · ${new Date(message.sentAt || message.createdAt).toLocaleTimeString()}`
                  : new Date(message.createdAt).toLocaleTimeString()}
              </small>
            </div>
          ))
        )}
      </div>
      <div className="composer">
        <span className="prompt">{">"}</span>
        <input
          className="text-input composer-input"
          value={text}
          placeholder="Type message..."
          onChange={(event) => setText(event.target.value)}
        />
        <button
          className="btn icon-btn"
          disabled={!text.trim()}
          onClick={() => {
            onSend(text.trim());
            setText("");
          }}
        >
          Send
        </button>
      </div>
    </section>
  );
}
