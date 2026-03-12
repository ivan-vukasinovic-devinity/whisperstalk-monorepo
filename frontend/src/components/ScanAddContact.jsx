import { useEffect, useMemo, useRef, useState } from "react";

function extractToken(rawInput) {
  const input = rawInput.trim();
  if (!input) return "";
  try {
    const asUrl = new URL(input);
    const byToken = asUrl.searchParams.get("token");
    const byInviteToken = asUrl.searchParams.get("inviteToken");
    if (byToken) return decodeURIComponent(byToken);
    if (byInviteToken) return decodeURIComponent(byInviteToken);

    const tokenMatch = input.match(/(?:token|inviteToken)=([^&\s]+)/i);
    if (tokenMatch?.[1]) return decodeURIComponent(tokenMatch[1]);
  } catch (_) {
    const tokenMatch = input.match(/(?:token|inviteToken)=([^&\s]+)/i);
    if (tokenMatch?.[1]) return decodeURIComponent(tokenMatch[1]);
  }
  return input;
}

function pickRearCamera(cameras) {
  const rear = cameras.find(
    (c) => /back|rear|environment/i.test(c.label)
  );
  return rear || cameras[cameras.length - 1];
}

export function ScanAddContact({ userId, onSubmitQr, onSubmitIdentifier, disabled, initialInviteValue = "" }) {
  const [qrValue, setQrValue] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const scannerRef = useRef(null);
  const token = useMemo(() => extractToken(qrValue), [qrValue]);

  useEffect(() => {
    if (initialInviteValue) {
      setQrValue(initialInviteValue);
    }
  }, [initialInviteValue]);

  useEffect(() => {
    if (!scanning) return undefined;
    let mounted = true;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const cameras = await Html5Qrcode.getCameras();
        if (!mounted || cameras.length === 0) {
          setScanError("No camera available for QR scanning.");
          return;
        }
        const camera = pickRearCamera(cameras);
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { deviceId: { exact: camera.id } },
          { fps: 8, qrbox: 220 },
          (decodedText) => {
            setQrValue(decodedText);
            setScanning(false);
          },
          () => {}
        );
      } catch (error) {
        if (mounted) {
          setScanError(error?.message || "Unable to start QR scanner.");
          setScanning(false);
        }
      }
    }

    startScanner();

    return () => {
      mounted = false;
      const scanner = scannerRef.current;
      if (scanner) {
        scannerRef.current = null;
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      }
    };
  }, [scanning]);

  return (
    <>
      <section className="panel add-contact-section">
        <h3>Scan QR Code</h3>
        <p className="muted">Scan a contact's QR code to send them a request.</p>
        <button
          className="btn ghost full-width-btn"
          disabled={disabled || scanning}
          onClick={() => {
            setScanError("");
            setScanning(true);
          }}
        >
          {scanning ? "Scanning..." : "Open Camera"}
        </button>
        {scanning ? <div id="qr-reader" className="scanner" /> : null}
        {scanError ? <p className="feedback-inline">{scanError}</p> : null}
        {token ? (
          <div className="qr-result">
            <span className="mono">{token}</span>
            <button
              className="btn small"
              disabled={disabled || !userId}
              onClick={() => {
                onSubmitQr(token);
                setQrValue("");
              }}
            >
              Send Request
            </button>
          </div>
        ) : null}
      </section>

      <section className="panel add-contact-section">
        <h3>Add by Username or ID</h3>
        <p className="muted">Enter a username or user ID to send a contact request.</p>
        <input
          className="text-input"
          placeholder="Username or User ID"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
        />
        <button
          className="btn full-width-btn"
          disabled={disabled || !identifier.trim() || !userId}
          onClick={() => {
            onSubmitIdentifier(identifier.trim());
            setIdentifier("");
          }}
        >
          Send Request
        </button>
      </section>
    </>
  );
}
