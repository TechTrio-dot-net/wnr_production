import { Request, Response, NextFunction } from "express";
import { SettingsModel } from "./settings.model";
import { encrypt, decrypt, encryptObject, decryptObject } from "../../lib/encryption";

// Fields that should be encrypted
const ENCRYPTED_FIELDS = [
  "payments.razorpay.keyId",
  "payments.razorpay.keySecret",
  "payments.razorpay.webhookSecret",
  "payments.stripe.publishableKey",
  "payments.stripe.secretKey",
  "payments.stripe.webhookSecret",
  "payments.custom.merchantId",
  "payments.custom.secret",
  "payments.custom.publicKey",
  "firebase.apiKey",
  "cloudinary.apiKey",
  "cloudinary.apiSecret",
];

/**
 * Helper to encrypt nested object fields
 */
function encryptSettings(settings: any): any {
  const encrypted = JSON.parse(JSON.stringify(settings)); // Deep clone
  
  // Encrypt payment gateway secrets
  if (encrypted.payments?.razorpay) {
    if (encrypted.payments.razorpay.keyId) {
      encrypted.payments.razorpay.keyId = encrypt(encrypted.payments.razorpay.keyId);
    }
    if (encrypted.payments.razorpay.keySecret) {
      encrypted.payments.razorpay.keySecret = encrypt(encrypted.payments.razorpay.keySecret);
    }
    if (encrypted.payments.razorpay.webhookSecret) {
      encrypted.payments.razorpay.webhookSecret = encrypt(encrypted.payments.razorpay.webhookSecret);
    }
  }
  
  if (encrypted.payments?.stripe) {
    if (encrypted.payments.stripe.publishableKey) {
      encrypted.payments.stripe.publishableKey = encrypt(encrypted.payments.stripe.publishableKey);
    }
    if (encrypted.payments.stripe.secretKey) {
      encrypted.payments.stripe.secretKey = encrypt(encrypted.payments.stripe.secretKey);
    }
    if (encrypted.payments.stripe.webhookSecret) {
      encrypted.payments.stripe.webhookSecret = encrypt(encrypted.payments.stripe.webhookSecret);
    }
  }
  
  if (encrypted.payments?.custom) {
    if (encrypted.payments.custom.merchantId) {
      encrypted.payments.custom.merchantId = encrypt(encrypted.payments.custom.merchantId);
    }
    if (encrypted.payments.custom.secret) {
      encrypted.payments.custom.secret = encrypt(encrypted.payments.custom.secret);
    }
    if (encrypted.payments.custom.publicKey) {
      encrypted.payments.custom.publicKey = encrypt(encrypted.payments.custom.publicKey);
    }
  }
  
  // Encrypt Firebase API key
  if (encrypted.firebase?.apiKey) {
    encrypted.firebase.apiKey = encrypt(encrypted.firebase.apiKey);
  }
  
  // Encrypt Cloudinary secrets
  if (encrypted.cloudinary?.apiKey) {
    encrypted.cloudinary.apiKey = encrypt(encrypted.cloudinary.apiKey);
  }
  if (encrypted.cloudinary?.apiSecret) {
    encrypted.cloudinary.apiSecret = encrypt(encrypted.cloudinary.apiSecret);
  }
  
  return encrypted;
}

/**
 * Helper to decrypt nested object fields
 */
function decryptSettings(settings: any): any {
  const decrypted = JSON.parse(JSON.stringify(settings)); // Deep clone
  
  // Decrypt payment gateway secrets
  if (decrypted.payments?.razorpay) {
    if (decrypted.payments.razorpay.keyId) {
      decrypted.payments.razorpay.keyId = decrypt(decrypted.payments.razorpay.keyId);
    }
    if (decrypted.payments.razorpay.keySecret) {
      decrypted.payments.razorpay.keySecret = decrypt(decrypted.payments.razorpay.keySecret);
    }
    if (decrypted.payments.razorpay.webhookSecret) {
      decrypted.payments.razorpay.webhookSecret = decrypt(decrypted.payments.razorpay.webhookSecret);
    }
  }
  
  if (decrypted.payments?.stripe) {
    if (decrypted.payments.stripe.publishableKey) {
      decrypted.payments.stripe.publishableKey = decrypt(decrypted.payments.stripe.publishableKey);
    }
    if (decrypted.payments.stripe.secretKey) {
      decrypted.payments.stripe.secretKey = decrypt(decrypted.payments.stripe.secretKey);
    }
    if (decrypted.payments.stripe.webhookSecret) {
      decrypted.payments.stripe.webhookSecret = decrypt(decrypted.payments.stripe.webhookSecret);
    }
  }
  
  if (decrypted.payments?.custom) {
    if (decrypted.payments.custom.merchantId) {
      decrypted.payments.custom.merchantId = decrypt(decrypted.payments.custom.merchantId);
    }
    if (decrypted.payments.custom.secret) {
      decrypted.payments.custom.secret = decrypt(decrypted.payments.custom.secret);
    }
    if (decrypted.payments.custom.publicKey) {
      decrypted.payments.custom.publicKey = decrypt(decrypted.payments.custom.publicKey);
    }
  }
  
  // Decrypt Firebase API key
  if (decrypted.firebase?.apiKey) {
    decrypted.firebase.apiKey = decrypt(decrypted.firebase.apiKey);
  }
  
  // Decrypt Cloudinary secrets
  if (decrypted.cloudinary?.apiKey) {
    decrypted.cloudinary.apiKey = decrypt(decrypted.cloudinary.apiKey);
  }
  if (decrypted.cloudinary?.apiSecret) {
    decrypted.cloudinary.apiSecret = decrypt(decrypted.cloudinary.apiSecret);
  }
  
  return decrypted;
}

/**
 * GET /api/settings
 * Get all settings (decrypted)
 */
export async function getSettings(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    let settings = await SettingsModel.findOne().lean();
    
    if (!settings) {
      // Return default settings if none exist
      const newSettings = await SettingsModel.create({});
      await newSettings.save();
      settings = newSettings.toObject() as any;
    }
    
    // Decrypt sensitive fields before sending
    const decrypted = decryptSettings(settings);
    res.json(decrypted);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/settings
 * Update settings (encrypt sensitive fields before saving)
 */
export async function updateSettings(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const updates = req.body;
    
    // Encrypt sensitive fields before saving
    const encrypted = encryptSettings(updates);
    
    // Use findOneAndUpdate with upsert to ensure only one document exists
    const settings = await SettingsModel.findOneAndUpdate(
      {},
      { $set: encrypted },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    
    // Decrypt before sending response
    const decrypted = decryptSettings(settings);
    res.json(decrypted);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/settings
 * Partially update settings (merge with existing)
 */
export async function patchSettings(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const updates = req.body;
    
    // Get existing settings
    let existing = await SettingsModel.findOne().lean();
    if (!existing) {
      const newSettings = await SettingsModel.create({});
      await newSettings.save();
      existing = newSettings.toObject() as any;
    }
    
    // Merge updates with existing (deep merge)
    const merged = JSON.parse(JSON.stringify(existing));
    
    // Deep merge function
    function deepMerge(target: any, source: any): any {
      const output = { ...target };
      if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach((key) => {
          if (isObject(source[key])) {
            if (!(key in target)) {
              Object.assign(output, { [key]: source[key] });
            } else {
              output[key] = deepMerge(target[key], source[key]);
            }
          } else {
            Object.assign(output, { [key]: source[key] });
          }
        });
      }
      return output;
    }
    
    function isObject(item: any): boolean {
      return item && typeof item === "object" && !Array.isArray(item);
    }
    
    const mergedSettings = deepMerge(merged, updates);
    
    // Encrypt sensitive fields
    const encrypted = encryptSettings(mergedSettings);
    
    // Update
    const settings = await SettingsModel.findOneAndUpdate(
      {},
      { $set: encrypted },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    
    // Decrypt before sending response
    const decrypted = decryptSettings(settings);
    res.json(decrypted);
  } catch (err) {
    next(err);
  }
}

