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

export function ScanAddContact({ userId, onSubmit, disabled, initialInviteValue = "" }) {
  const [value, setValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const scannerRef = useRef(null);
  const token = useMemo(() => extractToken(value), [value]);

  useEffect(() => {
    if (initialInviteValue && initialInviteValue !== value) {
      setValue(initialInviteValue);
    }
  }, [initialInviteValue, value]);

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
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { deviceId: { exact: cameras[0].id } },
          { fps: 8, qrbox: 220 },
          (decodedText) => {
            setValue(decodedText);
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
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [scanning]);

  return (
    <section className="panel">
      <h3>Add Contact</h3>
      <p className="muted">Scan a contact QR code, then send request.</p>
      <button
        className="btn ghost"
        disabled={disabled || scanning}
        onClick={() => {
          setScanError("");
          setScanning(true);
        }}
      >
        {scanning ? "Scanning..." : "Start QR Camera Scan"}
      </button>
      {scanning ? <div id="qr-reader" className="scanner" /> : null}
      {scanError ? <p className="feedback">{scanError}</p> : null}
      <input
        className="text-input"
        placeholder="Scanned QR payload or invite link"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button
        className="btn"
        disabled={disabled || !token || !userId}
        onClick={() => {
          onSubmit(token);
          setValue("");
        }}
      >
        Send Request
      </button>
    </section>
  );
}
