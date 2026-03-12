export function ContactList({ contacts, activeContactId, onSelect, nudgeFromSet }) {
  return (
    <section className="contact-list">
      {contacts.length === 0 ? (
        <p className="muted empty-contacts">No accepted contacts yet.</p>
      ) : (
        contacts.map((contact) => {
          const hasNudge = nudgeFromSet?.has(contact.contact_user_id);
          return (
            <button
              key={contact.contact_user_id}
              className={`contact-btn ${activeContactId === contact.contact_user_id ? "active" : ""} ${hasNudge ? "wants-chat" : ""}`}
              onClick={() => onSelect(contact)}
            >
              <span className="contact-row contact-row-main">
                <span className="contact-name">
                  {contact.alias || contact.display_name || "contact"}
                  {hasNudge ? <span className="chat-nudge-badge" /> : null}
                </span>
              </span>
              <span className="contact-row">
                <span className="contact-preview">
                  {hasNudge ? "wants to chat" : ">"} {hasNudge ? "" : "encrypted channel ready"}
                </span>
              </span>
            </button>
          );
        })
      )}
    </section>
  );
}
