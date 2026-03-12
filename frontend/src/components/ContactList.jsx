export function ContactList({ contacts, activeContactId, onSelect, presenceByUserId, wantsToChatSet }) {
  return (
    <section className="contact-list">
      {contacts.length === 0 ? (
        <p className="muted empty-contacts">No accepted contacts yet.</p>
      ) : (
        contacts.map((contact) => {
          const isOnline = !!presenceByUserId?.[contact.contact_user_id];
          const wantsToChat = wantsToChatSet?.has(contact.contact_user_id);
          return (
            <button
              key={contact.contact_user_id}
              className={`contact-btn ${activeContactId === contact.contact_user_id ? "active" : ""} ${wantsToChat ? "wants-chat" : ""}`}
              onClick={() => onSelect(contact)}
            >
              <span className="contact-row contact-row-main">
                <span className="contact-name">
                  {contact.alias || contact.display_name || "contact"}
                  {wantsToChat ? <span className="chat-nudge-badge" /> : null}
                </span>
                <span className="contact-time">{isOnline ? "online" : "offline"}</span>
              </span>
              <span className="contact-row">
                <span className="contact-preview">
                  {wantsToChat ? "wants to chat" : ">"} {wantsToChat ? "" : "encrypted channel ready"}
                </span>
                <span
                  className={`dot ${isOnline ? "green" : "red"}`}
                  aria-label={isOnline ? "online" : "offline"}
                />
              </span>
            </button>
          );
        })
      )}
    </section>
  );
}
