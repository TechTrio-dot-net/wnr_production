import { Schema, model, Document } from "mongoose";

export interface SettingsDoc extends Document {
  // General
  currency: string;
  currencySymbol: string;
  taxRate: number;
  offerStrip?: {
    enabled: boolean;
    text: string;
  };
  
  // Company
  company: {
    name: string;
    gstin: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
    email: string;
    website: string;
    invoiceNotes: string;
  };
  
  // Payment Gateways (encrypted)
  payments: {
    gateway: string;
    razorpay: {
      keyId: string; // encrypted
      keySecret: string; // encrypted
      webhookSecret: string; // encrypted
    };
    stripe: {
      publishableKey: string; // encrypted
      secretKey: string; // encrypted
      webhookSecret: string; // encrypted
    };
    custom: {
      merchantId: string; // encrypted
      secret: string; // encrypted
      publicKey: string; // encrypted
    };
  };
  
  // Firebase (encrypted)
  firebase: {
    apiKey: string; // encrypted
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
  
  // Cloudinary (encrypted)
  cloudinary: {
    cloudName: string;
    apiKey: string; // encrypted
    apiSecret: string; // encrypted
    uploadPreset: string;
    folder: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<SettingsDoc>(
  {
    currency: { type: String, default: "INR" },
    currencySymbol: { type: String, default: "₹" },
    taxRate: { type: Number, default: 18 },
    offerStrip: {
      enabled: { type: Boolean, default: false },
      text: { type: String, default: "" },
    },
    
    company: {
      name: { type: String, default: "" },
      gstin: { type: String, default: "" },
      address1: { type: String, default: "" },
      address2: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      zip: { type: String, default: "" },
      country: { type: String, default: "India" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      website: { type: String, default: "" },
      invoiceNotes: { type: String, default: "" },
    },
    
    payments: {
      gateway: { type: String, default: "" },
      razorpay: {
        keyId: { type: String, default: "" },
        keySecret: { type: String, default: "" },
        webhookSecret: { type: String, default: "" },
      },
      stripe: {
        publishableKey: { type: String, default: "" },
        secretKey: { type: String, default: "" },
        webhookSecret: { type: String, default: "" },
      },
      custom: {
        merchantId: { type: String, default: "" },
        secret: { type: String, default: "" },
        publicKey: { type: String, default: "" },
      },
    },
    
    firebase: {
      apiKey: { type: String, default: "" },
      authDomain: { type: String, default: "" },
      projectId: { type: String, default: "" },
      storageBucket: { type: String, default: "" },
      messagingSenderId: { type: String, default: "" },
      appId: { type: String, default: "" },
      measurementId: { type: String, default: "" },
    },
    
    cloudinary: {
      cloudName: { type: String, default: "" },
      apiKey: { type: String, default: "" },
      apiSecret: { type: String, default: "" },
      uploadPreset: { type: String, default: "" },
      folder: { type: String, default: "" },
    },
  },
  { timestamps: true, collection: "settings" }
);

// Ensure only one settings document exists
// We'll use a singleton pattern in the controller instead of a unique index

export const SettingsModel = model<SettingsDoc>("Settings", SettingsSchema);

