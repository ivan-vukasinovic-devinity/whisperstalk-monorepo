export function ContactList({ contacts, activeContactId, onSelect }) {
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
            <span className="contact-name">{contact.alias || contact.display_name}</span>
            <span className="contact-preview">{"> secure peer connected"}</span>
          </button>
        ))
      )}
    </section>
  );
}
