export function ContactList({ contacts, activeContactId, onSelect, unreadMap }) {
  return (
    <section className="contact-list">
      {contacts.length === 0 ? (
        <p className="muted empty-contacts">No accepted contacts yet.</p>
      ) : (
        contacts.map((contact) => {
          const unreadCount = unreadMap?.get(contact.contact_user_id) || 0;
          const hasUnread = unreadMap?.has(contact.contact_user_id);
          return (
            <button
              key={contact.contact_user_id}
              className={`contact-btn ${activeContactId === contact.contact_user_id ? "active" : ""} ${hasUnread ? "wants-chat" : ""}`}
              onClick={() => onSelect(contact)}
            >
              <span className="contact-row contact-row-main">
                <span className="contact-name">
                  {contact.alias || contact.display_name || "contact"}
                </span>
                {unreadCount > 0 ? (
                  <span className="unread-count-badge">{unreadCount}</span>
                ) : hasUnread ? (
                  <span className="chat-nudge-badge" />
                ) : null}
              </span>
              <span className="contact-row">
                <span className="contact-preview">
                  {hasUnread
                    ? <><svg className="unread-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> {unreadCount > 0 ? `${unreadCount} new message${unreadCount > 1 ? "s" : ""}` : "wants to chat"}</>
                    : "> tap to chat"}
                </span>
              </span>
            </button>
          );
        })
      )}
    </section>
  );
}
