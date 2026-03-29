const SALT = "whispertalk-e2e-v1";
const ITERATIONS = 100_000;

async function deriveKey(passcode) {
  const enc = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(passcode),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return globalThis.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(SALT), iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encrypt(plaintext, passcode) {
  const key = await deriveKey(passcode);
  const enc = new TextEncoder();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(cipherBuf), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(base64, passcode) {
  const key = await deriveKey(passcode);
  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const data = raw.slice(12);
  const plainBuf = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  return new TextDecoder().decode(plainBuf);
}
