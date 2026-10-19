export type MeetingMode = "meet" | "phone" | "whatsapp";
export type Currency = "NGN" | "USD";

export type BookingStatus =
  | "pending_payment"
  | "awaiting_verification"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "expired";

export type PaymentStatus = "unpaid" | "pending_verification" | "paid" | "failed" | "refunded" | "waived";
export type PaymentMethod = "paystack" | "flutterwave" | "bank_transfer" | "free";

export interface Titled {
  title: string;
  detail: string;
}

export interface SiteSettings {
  doctor_name: string;
  short_name: string;
  post_nominals: string;
  specialty: string;
  headline: string;
  tagline: string;
  short_bio: string;
  about_html: string;
  credentials: Titled[];
  experience: { role: string; place: string; period: string; summary: string }[];
  education: { title: string; place: string; year: string }[];
  interests: Titled[];
  approach: Titled[];
  engagements: string[];
  mdcn_number: string | null;
  photo_url: string | null;
  contact_email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  location: string | null;
  socials: Record<string, string>;
  seo_description: string | null;
  timezone: string;
}

export interface PrivateSettings {
  slot_interval_minutes: number;
  buffer_minutes: number;
  min_notice_hours: number;
  max_advance_days: number;
  hold_minutes: number;
  bank_hold_hours: number;
  default_meet_url: string | null;
  phone_instructions: string | null;
  payments: { paystack: boolean; flutterwave: boolean; bank_transfer: boolean };
  bank_details: { bank_name?: string; account_name?: string; account_number?: string; note?: string };
  notify: { email: boolean; whatsapp: boolean; reminder_hours: number[] };
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  duration_minutes: number;
  price_ngn_kobo: number;
  price_usd_cents: number | null;
  modes: MeetingMode[];
  is_active: boolean;
  sort_order: number;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_url: string | null;
  cover_alt: string | null;
  content_html: string;
  content_json: unknown;
  status: "draft" | "published";
  published_at: string | null;
  category: string | null;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  reading_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  reference: string;
  access_token: string;
  service_id: string | null;
  service_name: string;
  duration_minutes: number;
  amount_minor: number;
  currency: Currency;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  patient_whatsapp: string | null;
  reason: string | null;
  meeting_mode: MeetingMode;
  patient_timezone: string | null;
  consent_at: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  payment_reference: string | null;
  paid_at: string | null;
  meeting_url: string | null;
  hold_expires_at: string | null;
  reminders_sent: Record<string, string>;
  cancelled_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export const MODE_LABEL: Record<MeetingMode, string> = {
  meet: "Google Meet video call",
  phone: "Phone call",
  whatsapp: "WhatsApp call",
};
