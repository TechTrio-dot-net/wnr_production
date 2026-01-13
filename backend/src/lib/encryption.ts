import crypto from "crypto";

/**
 * Encryption key from environment variable.
 * Generate a 32-byte key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * Must be 64 hex characters (32 bytes) for AES-256
 */
function getEncryptionKey(): Buffer {
  const key = process.env.SETTINGS_ENCRYPTION_KEY;
  if (key && key.length === 64) {
    return Buffer.from(key, "hex");
  }
  // Fallback: generate a key (not recommended for production)
  console.warn("[encryption] SETTINGS_ENCRYPTION_KEY not set or invalid. Using generated key (not persistent).");
  return crypto.randomBytes(32);
}

const ENCRYPTION_KEY = getEncryptionKey();
const ALGORITHM = "aes-256-gcm";

/**
 * Encrypts a string value using AES-256-GCM
 */
export function encrypt(value: string): string {
  if (!value) return value;
  
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(value, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag();
    
    // Return: iv:authTag:encrypted
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("[encryption] Encrypt error:", error);
    throw new Error("Encryption failed");
  }
}

/**
 * Decrypts an encrypted string value
 * If value appears encrypted but decryption fails, returns it as-is (no warnings)
 */
export function decrypt(encryptedValue: string): string {
  if (!encryptedValue) return encryptedValue;
  
  // Check if it's already decrypted (not in encrypted format)
  if (!encryptedValue.includes(":")) {
    return encryptedValue;
  }
  
  const parts = encryptedValue.split(":");
  if (parts.length !== 3) {
    // Not in encrypted format, return as-is
    return encryptedValue;
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  if (!ivHex || !authTagHex || !encrypted) {
    // Invalid format, return as-is
    return encryptedValue;
  }
  
  // Validate hex format (each part should be valid hex)
  const isValidHex = (str: string) => /^[0-9a-f]+$/i.test(str);
  if (!isValidHex(ivHex) || !isValidHex(authTagHex) || !isValidHex(encrypted)) {
    // Not valid hex, probably not encrypted
    return encryptedValue;
  }
  
  // Check if IV and authTag have correct lengths (IV: 32 hex chars = 16 bytes, AuthTag: 32 hex chars = 16 bytes)
  if (ivHex.length !== 32 || authTagHex.length !== 32) {
    // Invalid lengths, probably not encrypted
    return encryptedValue;
  }
  
  // If it looks like encrypted format, try to decrypt silently
  // If decryption fails, return as-is without warnings
  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    // Silently return encrypted value as-is if decryption fails
    // No warnings, no errors - just leave it encrypted
    return encryptedValue;
  }
}

/**
 * Encrypts an object's sensitive fields
 */
export function encryptObject<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[]
): T {
  const encrypted = { ...obj };
  for (const field of sensitiveFields) {
    if (field in encrypted && typeof encrypted[field] === "string") {
      (encrypted as Record<string, unknown>)[field] = encrypt(encrypted[field] as string);
    }
  }
  return encrypted;
}

/**
 * Decrypts an object's sensitive fields
 */
export function decryptObject<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[]
): T {
  const decrypted = { ...obj };
  for (const field of sensitiveFields) {
    if (field in decrypted && typeof decrypted[field] === "string") {
      (decrypted as Record<string, unknown>)[field] = decrypt(decrypted[field] as string);
    }
  }
  return decrypted;
}

