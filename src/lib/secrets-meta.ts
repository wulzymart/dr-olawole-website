/** Client-safe labels for the keys stored by secrets.ts. */
export const SECRET_KEYS = {
  paystack_secret: { label: "Paystack secret key", group: "paystack", placeholder: "sk_live_..." },
  flutterwave_secret: { label: "Flutterwave secret key", group: "flutterwave", placeholder: "FLWSECK-..." },
  flutterwave_webhook_hash: { label: "Flutterwave webhook secret hash", group: "flutterwave", placeholder: "Your secret hash" },
  resend_api_key: { label: "Resend API key", group: "email", placeholder: "re_..." },
  email_from: { label: "Send emails from", group: "email", placeholder: "Dr Olawole <hello@yourdomain.com>" },
  whatsapp_token: { label: "WhatsApp Cloud API access token", group: "whatsapp", placeholder: "EAAG..." },
  whatsapp_phone_id: { label: "WhatsApp phone number ID", group: "whatsapp", placeholder: "1234567890" },
  whatsapp_template: { label: "WhatsApp message template name", group: "whatsapp", placeholder: "booking_update" },
} as const;

export type SecretKey = keyof typeof SECRET_KEYS;
