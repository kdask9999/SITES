export type WhatsAppStatus =
  | "unavailable"
  | "landline"
  | "pending"
  | "eligible"
  | "valid"
  | "invalid"
  | "error";

export type PhoneType = "mobile" | "landline" | "unknown";

export type Lead = {
  id: string;
  name: string;
  category: string;
  searchSegment: string;
  phone: string;
  phoneE164: string;
  phoneType: PhoneType;
  whatsappStatus: WhatsAppStatus;
  whatsappId?: string;
  email: string;
  website: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  address: string;
  city: string;
  rating: number | null;
  reviewCount: number;
  googleMapsUrl: string;
  latitude: number | null;
  longitude: number | null;
  businessStatus: string;
  source: "google" | "demo";
};

export type SearchHistoryItem = {
  id: string;
  activity: string;
  city: string;
  radius: number;
  limit: number;
  resultCount: number;
  createdAt: string;
};

export type SiteSample = {
  id: string;
  leadId: string;
  slug: string;
  companyName: string;
  segment: string;
  city: string;
  phone: string;
  address: string;
  template: string;
  primaryColor: string;
  status: string;
  pipelineStatus: string;
  views: number;
  createdAt: string;
};
