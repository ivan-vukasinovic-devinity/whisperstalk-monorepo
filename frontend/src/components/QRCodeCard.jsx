import { useState } from "react";

import { QRCodeCanvas } from "qrcode.react";

export function QRCodeCard({ user }) {
  if (!user) return null;
  const [shareStatus, setShareStatus] = useState("");

  const qrPayload = `whispers://add?token=${user.qr_token}&user_id=${user.id}`;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const inviteLink = `${baseUrl}/?inviteToken=${encodeURIComponent(user.qr_token)}`;

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setShareStatus("Invite link copied.");
    } catch (_) {
      setShareStatus("Could not copy link.");
    }
  }

  async function shareInviteLink() {
    if (!navigator.share) {
      setShareStatus("Native share is not available.");
      return;
    }
    try {
      await navigator.share({ title: "WhisperTalk invite", text: "Add me on WhisperTalk", url: inviteLink });
      setShareStatus("Invite link shared.");
    } catch (_) {
      setShareStatus("Share cancelled.");
    }
  }

  return (
    <section className="panel">
      <h3>Your QR Code</h3>
      <p className="muted">Share this QR code to let someone add you.</p>
      <div className="qr-wrap">
        <QRCodeCanvas value={qrPayload} size={168} includeMargin />
      </div>
      <code className="mono">ID: {user.id.slice(0, 12)}...</code>
      <code className="mono invite-link">{inviteLink}</code>
      <div className="invite-actions">
        <button className="btn small ghost" onClick={copyInviteLink}>
          Copy Invite Link
        </button>
        <button className="btn small ghost" onClick={shareInviteLink}>
          Share
        </button>
      </div>
      {shareStatus ? <p className="muted share-status">{shareStatus}</p> : null}
    </section>
  );
}
