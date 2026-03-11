import { useState } from "react";

export function ChatWindow({ contact, connectionState, messages, onSend }) {
  const [text, setText] = useState("");

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
        <span className={`status-pill ${connectionState === "connected" ? "online" : ""}`}>
          {connectionState || "disconnected"}
        </span>
      </div>
      <div className="messages">
        {messages.length === 0 ? (
          <p className="muted">No messages in the last 12h.</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`bubble ${message.me ? "me" : "peer"}`}>
              <div>{message.text}</div>
              <small>{new Date(message.createdAt).toLocaleTimeString()}</small>
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
