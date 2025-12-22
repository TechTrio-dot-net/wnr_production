// src/modules/inbox/types.ts
export type ReasonOption =
  | "Orders"
  | "Product question"
  | "Gifting / Corporate"
  | "Collabs / Events"
  | "Feedback";

export interface ContactCreateInput {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  reason: ReasonOption;
  interests?: string[];
  meta?: {
    userAgent?: string;
    referer?: string;
    ip?: string; // server-side populated
  };
}
