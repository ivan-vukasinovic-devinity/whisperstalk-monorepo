export function ContactList({ contacts, activeContactId, onSelect, presenceByUserId }) {
  return (
    <section className="panel contact-list">
      <h3>Contacts</h3>
      {contacts.length === 0 ? (
        <p className="muted">No accepted contacts yet.</p>
      ) : (
        contacts.map((contact) => (
          <button
            key={contact.contact_user_id}
            className={`contact-btn ${activeContactId === contact.contact_user_id ? "active" : ""}`}
            onClick={() => onSelect(contact)}
          >
            <span className="contact-row">
              <span className="contact-name">{contact.alias || contact.display_name}</span>
              <span
                className={`dot ${presenceByUserId?.[contact.contact_user_id] ? "green" : "red"}`}
                aria-label={presenceByUserId?.[contact.contact_user_id] ? "online" : "offline"}
              />
            </span>
            <span className="contact-preview">
              {presenceByUserId?.[contact.contact_user_id] ? "connected" : "not connected"}
            </span>
          </button>
        ))
      )}
    </section>
  );
}
