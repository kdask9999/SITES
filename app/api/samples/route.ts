import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { crmLeads, siteSamples } from "../../../db/schema";
import type { Lead } from "../../types";

export const runtime = "edge";

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 58);
}

function safeColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : "#1769e0";
}

export async function GET() {
  try {
    const rows = await getDb().select().from(siteSamples).orderBy(desc(siteSamples.createdAt)).limit(250);
    return Response.json({ samples: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ samples: [], unavailable: true }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  let body: { leads?: Lead[]; template?: string; primaryColor?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitação inválida." }, { status: 400 }); }
  const leads = (Array.isArray(body.leads) ? body.leads : []).slice(0, 20);
  if (!leads.length) return Response.json({ error: "Selecione pelo menos uma empresa." }, { status: 400 });

  const db = getDb();
  const created = [];
  for (const lead of leads) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const slug = `${slugify(lead.name) || "empresa"}-${id.slice(0, 7)}`;
    const sample = {
      id, leadId: lead.id, slug, companyName: lead.name, segment: lead.searchSegment || lead.category,
      city: lead.city, phone: lead.phoneE164 || lead.phone, address: lead.address,
      template: String(body.template || "moderno").slice(0, 30), primaryColor: safeColor(body.primaryColor),
      status: "pronto", pipelineStatus: "pronto_revisar", views: 0, createdAt: now, updatedAt: now,
    };
    await db.insert(crmLeads).values({
      id: lead.id, name: lead.name, category: lead.category, searchSegment: lead.searchSegment,
      phone: lead.phone, phoneE164: lead.phoneE164, phoneType: lead.phoneType,
      whatsappStatus: lead.whatsappStatus, whatsappId: lead.whatsappId || null, email: lead.email,
      website: lead.website, instagram: lead.instagram, facebook: lead.facebook, linkedin: lead.linkedin,
      address: lead.address, city: lead.city, rating: lead.rating == null ? null : Math.round(lead.rating * 10),
      reviewCount: lead.reviewCount, googleMapsUrl: lead.googleMapsUrl,
      latitude: lead.latitude == null ? null : String(lead.latitude), longitude: lead.longitude == null ? null : String(lead.longitude),
      businessStatus: lead.businessStatus, updatedAt: now,
    }).onConflictDoUpdate({ target: crmLeads.id, set: { name: lead.name, phone: lead.phone, website: lead.website, email: lead.email, updatedAt: now } });
    await db.insert(siteSamples).values(sample);
    created.push(sample);
  }
  return Response.json({ samples: created });
}

export async function PATCH(request: Request) {
  const body = await request.json() as { id?: string; pipelineStatus?: string };
  if (!body.id || !body.pipelineStatus) return Response.json({ error: "Dados incompletos." }, { status: 400 });
  await getDb().update(siteSamples).set({ pipelineStatus: body.pipelineStatus.slice(0, 40), updatedAt: new Date().toISOString() }).where(eq(siteSamples.id, body.id));
  return Response.json({ ok: true });
}
