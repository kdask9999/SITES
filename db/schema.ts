import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const apiUsageMonthly = sqliteTable("api_usage_monthly", {
  month: text("month").primaryKey(),
  searchActions: integer("search_actions").notNull().default(0),
  textSearchProRequests: integer("text_search_pro_requests").notNull().default(0),
  textSearchEnterpriseRequests: integer("text_search_enterprise_requests")
    .notNull()
    .default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const apiUsageDaily = sqliteTable("api_usage_daily", {
  date: text("date").primaryKey(),
  searchActions: integer("search_actions").notNull().default(0),
  textSearchProRequests: integer("text_search_pro_requests").notNull().default(0),
  textSearchEnterpriseRequests: integer("text_search_enterprise_requests")
    .notNull()
    .default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const crmLeads = sqliteTable("crm_leads", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default("Empresa"),
  searchSegment: text("search_segment").notNull().default(""),
  phone: text("phone").notNull().default(""),
  phoneE164: text("phone_e164").notNull().default(""),
  phoneType: text("phone_type").notNull().default("unknown"),
  whatsappStatus: text("whatsapp_status").notNull().default("unavailable"),
  whatsappId: text("whatsapp_id"),
  email: text("email").notNull().default(""),
  website: text("website").notNull().default(""),
  instagram: text("instagram").notNull().default(""),
  facebook: text("facebook").notNull().default(""),
  linkedin: text("linkedin").notNull().default(""),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  rating: integer("rating_x10"),
  reviewCount: integer("review_count").notNull().default(0),
  googleMapsUrl: text("google_maps_url").notNull().default(""),
  latitude: text("latitude"),
  longitude: text("longitude"),
  businessStatus: text("business_status").notNull().default("OPERATIONAL"),
  pipelineStatus: text("pipeline_status").notNull().default("novo"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const siteSamples = sqliteTable("site_samples", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull(),
  slug: text("slug").notNull().unique(),
  companyName: text("company_name").notNull(),
  segment: text("segment").notNull().default("Empresa"),
  city: text("city").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  template: text("template").notNull().default("moderno"),
  primaryColor: text("primary_color").notNull().default("#1769e0"),
  status: text("status").notNull().default("pronto"),
  pipelineStatus: text("pipeline_status").notNull().default("pronto_revisar"),
  views: integer("views").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
