export function ContactList({ contacts, activeContactId, onSelect, presenceByUserId }) {
  return (
    <section className="contact-list">
      {contacts.length === 0 ? (
        <p className="muted empty-contacts">No accepted contacts yet.</p>
      ) : (
        contacts.map((contact) => (
          <button
            key={contact.contact_user_id}
            className={`contact-btn ${activeContactId === contact.contact_user_id ? "active" : ""}`}
            onClick={() => onSelect(contact)}
          >
            <span className="contact-row contact-row-main">
              <span className="contact-name">{contact.alias || contact.display_name || "contact"}</span>
              <span className="contact-time">{presenceByUserId?.[contact.contact_user_id] ? "online" : "offline"}</span>
            </span>
            <span className="contact-row">
              <span className="contact-preview">{">"} encrypted channel ready</span>
              <span
                className={`dot ${presenceByUserId?.[contact.contact_user_id] ? "green" : "red"}`}
                aria-label={presenceByUserId?.[contact.contact_user_id] ? "online" : "offline"}
              />
            </span>
          </button>
        ))
      )}
    </section>
  );
}
