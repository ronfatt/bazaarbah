export type Profile = {
  id: string;
  display_name: string | null;
  role: "seller" | "admin";
  plan_tier: "free" | "pro_88" | "pro_128";
  plan: "basic" | "pro";
  poster_credits: number;
  image_credits: number;
  copy_credits: number;
  referral_code: string | null;
  referred_by: string | null;
  referral_rewarded_at: string | null;
  referral_bonus_total: number;
  is_banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  created_at: string;
};

export type Shop = {
  id: string;
  owner_id: string;
  slug: string;
  shop_name: string;
  phone_whatsapp: string;
  address_text: string | null;
  theme: "gold" | "minimal" | "cute";
  logo_url: string | null;
  payment_qr_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type Product = {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: "MYR";
  image_url: string | null;
  image_original_url?: string | null;
  image_enhanced_url?: string | null;
  image_source?: "original" | "enhanced";
  enhanced_at?: string | null;
  enhanced_meta?: Record<string, unknown> | null;
  is_available: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  order_code: string;
  shop_id: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  status: "pending_payment" | "proof_submitted" | "paid" | "cancelled";
  subtotal_cents: number;
  paid_at?: string | null;
  created_at: string;
};
