const SALT = new Uint8Array([82, 101, 99, 111, 114, 100, 76, 105, 117, 83, 101, 99, 114, 101, 116, 83]); // Static salt "RecordLiuSecretS"

async function getKey(password: string) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: SALT,
      iterations: 600000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(data: any, password: string): Promise<string> {
  try {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await getKey(password);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(JSON.stringify(data))
    );
    
    // Combine iv + encrypted
    const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.byteLength);
    
    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.error("Encryption failed:", e);
    throw e;
  }
}

export async function decryptData(encryptedBase64: string, password: string): Promise<any> {
  try {
    const dec = new TextDecoder();
    const binary = atob(encryptedBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const iv = bytes.slice(0, 12);
    const encrypted = bytes.slice(12);
    
    const key = await getKey(password);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encrypted
    );
    
    return JSON.parse(dec.decode(decrypted));
  } catch (e) {
    console.error("Decryption failed:", e);
    throw new Error("Senha incorreta ou dados corrompidos");
  }
}
