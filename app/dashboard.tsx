"use client";

import {
  BarChart3,
  ArrowDownUp,
  AtSign,
  BookUser,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileSearch,
  FileSpreadsheet,
  Globe2,
  LayoutTemplate,
  History,
  Link2,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  MessageCircleMore,
  Phone,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Palette,
  Star,
  Store,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Lead, SearchHistoryItem, SiteSample, WhatsAppStatus } from "./types";

type View = "search" | "contacts" | "samples" | "validation" | "history" | "usage";
type Filter = "all" | "mobile" | "valid" | "pending" | "invalid" | "email" | "own-site" | "social" | "no-site";
type Sort = "rating" | "reviews" | "name";

type ToastState = {
  message: string;
  tone: "success" | "warning" | "error" | "info";
};

type DashboardProps = {
  userName: string;
  userEmail: string;
};

type ApiUsageSku = {
  id: "text-search-pro" | "text-search-enterprise";
  name: string;
  description: string;
  requests: number;
  freeCap: number;
  freeUsed: number;
  freeRemaining: number;
  freePercent: number;
  basePricePerThousand: number;
  freeCreditValueUsedUsd: number;
  grossListValueUsd: number;
  estimatedPaidCostUsd: number;
};

type ApiUsageSummary = {
  configured: boolean;
  month: string;
  searches: number;
  totalRequests: number;
  grossListValueUsd: number;
  estimatedPaidCostUsd: number;
  freeCreditValueUsedUsd: number;
  freeCreditValueLimitUsd: number;
  freeCreditPercent: number;
  daily: {
    date: string;
    searches: number;
    totalRequests: number;
  };
  updatedAt: string | null;
  lifetime: { searches: number; totalRequests: number };
  skus: ApiUsageSku[];
  pricingUpdatedAt: string;
  pricingSource: string;
  usageLimitsSource: string;
  quotaManagementSource: string;
  disclaimer: string;
};

const HISTORY_KEY = "gm-web-extractor-history-v1";
const PAGE_SIZE = 10;

const INITIAL_LEADS: Lead[] = [
  {
    id: "initial-1",
    name: "Horizonte Elétrica · demonstração",
    category: "Loja de materiais elétricos",
    searchSegment: "Lojas de materiais elétricos",
    phone: "(64) 99000-0001",
    phoneE164: "+5564990000001",
    phoneType: "mobile",
    whatsappStatus: "valid",
    whatsappId: "5564990000001",
    email: "contato@empresa-demo.com.br",
    website: "https://example.com",
    instagram: "https://instagram.com/empresa_demo",
    facebook: "",
    linkedin: "",
    address: "Av. Comercial, 120 — Centro",
    city: "Rio Verde - GO",
    rating: 4.8,
    reviewCount: 126,
    googleMapsUrl: "https://maps.google.com",
    latitude: -17.7923,
    longitude: -50.9192,
    businessStatus: "OPERATIONAL",
    source: "demo",
  },
  {
    id: "initial-2",
    name: "Central Volt Materiais · demonstração",
    category: "Distribuidor elétrico",
    searchSegment: "Lojas de materiais elétricos",
    phone: "(64) 99000-0002",
    phoneE164: "+5564990000002",
    phoneType: "mobile",
    whatsappStatus: "pending",
    email: "",
    website: "https://example.com",
    instagram: "",
    facebook: "",
    linkedin: "",
    address: "Rua das Empresas, 308 — Centro",
    city: "Rio Verde - GO",
    rating: 4.6,
    reviewCount: 84,
    googleMapsUrl: "https://maps.google.com",
    latitude: -17.7931,
    longitude: -50.9181,
    businessStatus: "OPERATIONAL",
    source: "demo",
  },
  {
    id: "initial-3",
    name: "Luz & Rede Comercial · demonstração",
    category: "Materiais elétricos",
    searchSegment: "Lojas de materiais elétricos",
    phone: "(64) 99000-0003",
    phoneE164: "+5564990000003",
    phoneType: "mobile",
    whatsappStatus: "pending",
    email: "vendas@empresa-demo.com.br",
    website: "https://example.com",
    instagram: "",
    facebook: "",
    linkedin: "",
    address: "Av. Presidente Vargas, 742",
    city: "Rio Verde - GO",
    rating: 4.4,
    reviewCount: 63,
    googleMapsUrl: "https://maps.google.com",
    latitude: -17.7942,
    longitude: -50.9201,
    businessStatus: "OPERATIONAL",
    source: "demo",
  },
  {
    id: "initial-4",
    name: "Ponto Elétrico Regional · demonstração",
    category: "Comércio",
    searchSegment: "Lojas de materiais elétricos",
    phone: "(64) 3000-0004",
    phoneE164: "+556430000004",
    phoneType: "landline",
    whatsappStatus: "landline",
    email: "",
    website: "",
    instagram: "",
    facebook: "",
    linkedin: "",
    address: "Rua 12, 455 — Jardim Goiás",
    city: "Rio Verde - GO",
    rating: 4.2,
    reviewCount: 41,
    googleMapsUrl: "https://maps.google.com",
    latitude: -17.791,
    longitude: -50.917,
    businessStatus: "OPERATIONAL",
    source: "demo",
  },
  {
    id: "initial-5",
    name: "Nova Energia Suprimentos · demonstração",
    category: "Atacadista",
    searchSegment: "Lojas de materiais elétricos",
    phone: "(64) 99000-0005",
    phoneE164: "+5564990000005",
    phoneType: "mobile",
    whatsappStatus: "invalid",
    email: "",
    website: "https://example.com",
    instagram: "",
    facebook: "",
    linkedin: "",
    address: "Av. Universitária, 1010",
    city: "Rio Verde - GO",
    rating: 4.1,
    reviewCount: 37,
    googleMapsUrl: "https://maps.google.com",
    latitude: -17.796,
    longitude: -50.916,
    businessStatus: "OPERATIONAL",
    source: "demo",
  },
];

const STATUS_LABELS: Record<WhatsAppStatus, string> = {
  valid: "Confirmado",
  invalid: "Não encontrado",
  pending: "A validar",
  eligible: "Celular válido",
  landline: "Telefone fixo",
  unavailable: "Sem número",
  error: "Falha na consulta",
};

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function getWhatsAppLink(lead: Lead) {
  let digits = normalizeDigits(lead.phoneE164 || lead.phone);
  digits = digits.replace(/^0+/, "");
  if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`;
  }
  return digits.length >= 12 && digits.length <= 13 ? `https://wa.me/${digits}` : "";
}

const SOCIAL_HOSTS = ["instagram.com", "facebook.com", "fb.com", "linktr.ee", "tiktok.com", "wa.me"];

function websiteKind(lead: Lead) {
  const candidates = [lead.website, lead.instagram, lead.facebook].filter(Boolean);
  if (!candidates.length) return "none" as const;
  const own = candidates.some((value) => {
    try { return !SOCIAL_HOSTS.some((host) => new URL(value).hostname.replace(/^www\./, "").endsWith(host)); }
    catch { return false; }
  });
  return own ? "own" as const : "social" as const;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "EQ";
  return `${parts[0]?.[0] || ""}${parts.length > 1 ? parts.at(-1)?.[0] || "" : ""}`.toUpperCase();
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
}

function fileSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function getExportFileBase(leads: Lead[], fallbackSegment: string, fallbackCity: string) {
  const segment = leads.find((lead) => lead.searchSegment.trim())?.searchSegment || fallbackSegment;
  const contactCity = leads.find((lead) => lead.city.trim())?.city || fallbackCity;
  return fileSlug(`${segment}-${contactCity}`) || "contatos";
}

function downloadTextFile(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getAgendaName(lead: Lead, fallbackCity: string, fallbackSegment: string) {
  const contactCity = lead.city.trim() || fallbackCity.trim();
  const segment = lead.searchSegment.trim() || fallbackSegment.trim() || lead.category.trim();
  return [contactCity, lead.name.trim(), segment].filter(Boolean).join(" | ");
}

function getAgendaPhone(lead: Lead) {
  let digits = normalizeDigits(lead.phoneE164 || lead.phone).replace(/^0+/, "");
  if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`;
  }
  return digits.length >= 12 && digits.length <= 13 ? `+${digits}` : lead.phone.trim();
}

function vCardText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function MetricCard({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone: "cyan" | "blue" | "green" | "violet";
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <strong>{value.toLocaleString("pt-BR")}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

function WhatsAppBadge({ status }: { status: WhatsAppStatus }) {
  const Icon =
    status === "valid"
      ? CheckCircle2
      : status === "invalid"
        ? XCircle
        : status === "pending" || status === "eligible"
          ? Clock3
          : Phone;
  return (
    <span className={`status-badge status-${status}`}>
      <Icon size={14} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function Dashboard({ userName, userEmail }: DashboardProps) {
  const [activeView, setActiveView] = useState<View>("search");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activity, setActivity] = useState("Lojas de materiais elétricos");
  const [city, setCity] = useState("Rio Verde - GO");
  const [radius, setRadius] = useState(20);
  const [limit, setLimit] = useState(60);
  const [autoEnrich, setAutoEnrich] = useState(true);
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [isDemo, setIsDemo] = useState(true);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [validatorConfigured, setValidatorConfigured] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("rating");
  const [resultSearch, setResultSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [validating, setValidating] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [apiUsage, setApiUsage] = useState<ApiUsageSummary | null>(null);
  const [samples, setSamples] = useState<SiteSample[]>([]);
  const [generatingSamples, setGeneratingSamples] = useState(false);
  const [sampleTemplate, setSampleTemplate] = useState("moderno");
  const [sampleColor, setSampleColor] = useState("#1769e0");
  const [usageLoading, setUsageLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(HISTORY_KEY);
        if (stored) setHistoryItems(JSON.parse(stored) as SearchHistoryItem[]);
      } catch {
        window.localStorage.removeItem(HISTORY_KEY);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetch("/api/samples", { cache: "no-store" }).then((response) => response.json())
      .then((data: { samples?: SiteSample[] }) => setSamples(data.samples || [])).catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/usage", { cache: "no-store" });
        const data = (await response.json()) as ApiUsageSummary & { error?: string };
        if (!response.ok) throw new Error(data.error || "Falha ao consultar o uso da API.");
        if (!cancelled) setApiUsage(data);
      } catch {
        // The usage panel provides an explicit refresh action if the first load is unavailable.
      } finally {
        if (!cancelled) setUsageLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const metrics = useMemo(
    () => ({
      companies: leads.length,
      mobiles: leads.filter((lead) => lead.phoneType === "mobile").length,
      whatsapp: leads.filter((lead) => lead.whatsappStatus === "valid").length,
      emails: leads.filter((lead) => Boolean(lead.email)).length,
      ownSites: leads.filter((lead) => websiteKind(lead) === "own").length,
      socialOnly: leads.filter((lead) => websiteKind(lead) === "social").length,
      noSites: leads.filter((lead) => websiteKind(lead) === "none").length,
    }),
    [leads],
  );

  const validationMetrics = useMemo(
    () => ({
      valid: leads.filter((lead) => lead.whatsappStatus === "valid").length,
      pending: leads.filter((lead) =>
        ["pending", "eligible", "error"].includes(lead.whatsappStatus),
      ).length,
      invalid: leads.filter((lead) => lead.whatsappStatus === "invalid").length,
      landline: leads.filter((lead) => lead.whatsappStatus === "landline").length,
    }),
    [leads],
  );

  const filteredLeads = useMemo(() => {
    const needle = resultSearch.trim().toLocaleLowerCase("pt-BR");
    const list = leads.filter((lead) => {
      if (
        needle &&
        ![lead.name, lead.category, lead.phone, lead.city, lead.email]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(needle)
      ) {
        return false;
      }
      if (filter === "mobile") return lead.phoneType === "mobile";
      if (filter === "valid") return lead.whatsappStatus === "valid";
      if (filter === "pending") {
        return ["pending", "eligible", "error"].includes(lead.whatsappStatus);
      }
      if (filter === "invalid") return lead.whatsappStatus === "invalid";
      if (filter === "email") return Boolean(lead.email);
      if (filter === "own-site") return websiteKind(lead) === "own";
      if (filter === "social") return websiteKind(lead) === "social";
      if (filter === "no-site") return websiteKind(lead) === "none";
      return true;
    });

    return [...list].sort((a, b) => {
      const aHasPhone = normalizeDigits(a.phoneE164 || a.phone).length >= 10;
      const bHasPhone = normalizeDigits(b.phoneE164 || b.phone).length >= 10;
      if (aHasPhone !== bHasPhone) return aHasPhone ? -1 : 1;
      if (sort === "name") return a.name.localeCompare(b.name, "pt-BR");
      if (sort === "reviews") return b.reviewCount - a.reviewCount;
      return (b.rating || 0) - (a.rating || 0);
    });
  }, [filter, leads, resultSearch, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const selectedLeads = leads.filter((lead) => selectedIds.has(lead.id));
  const pageFullySelected =
    paginatedLeads.length > 0 && paginatedLeads.every((lead) => selectedIds.has(lead.id));

  function notify(message: string, tone: ToastState["tone"] = "info") {
    setToast({ message, tone });
  }

  function saveHistory(item: SearchHistoryItem) {
    const next = [item, ...historyItems].slice(0, 12);
    setHistoryItems(next);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }

  async function refreshApiUsage(showFeedback = false) {
    setUsageLoading(true);
    try {
      const response = await fetch("/api/usage", { cache: "no-store" });
      const data = (await response.json()) as ApiUsageSummary & { error?: string };
      if (!response.ok) throw new Error(data.error || "Falha ao consultar o uso da API.");
      setApiUsage(data);
      if (showFeedback) notify("Estimativa de consumo atualizada.", "success");
    } catch (error) {
      if (showFeedback) {
        notify(error instanceof Error ? error.message : "Falha ao atualizar o consumo.", "error");
      }
    } finally {
      setUsageLoading(false);
    }
  }

  async function handleSearch(event?: FormEvent) {
    event?.preventDefault();
    if (activity.trim().length < 2 || city.trim().length < 2) {
      notify("Informe o segmento e a cidade para pesquisar.", "warning");
      return;
    }

    setSearching(true);
    setLeads([]);
    setSelectedIds(new Set());
    setCurrentPage(1);
    setResultSearch("");
    setFilter("all");
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, max-age=0",
          Pragma: "no-cache",
        },
        body: JSON.stringify({ activity, city, radius, limit }),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
        leads?: Lead[];
        demo?: boolean;
        configured?: boolean;
      };
      if (!response.ok) throw new Error(data.error || "Não foi possível realizar a busca.");

      const nextLeads = (data.leads || []).map((lead) => ({
        ...lead,
        searchSegment: lead.searchSegment || activity.trim(),
      }));
      setLeads(nextLeads);
      setCurrentPage(1);
      setIsDemo(Boolean(data.demo));
      setGoogleConfigured(Boolean(data.configured));
      saveHistory({
        id: crypto.randomUUID(),
        activity: activity.trim(),
        city: city.trim(),
        radius,
        limit,
        resultCount: nextLeads.length,
        createdAt: new Date().toISOString(),
      });
      notify(data.message || `${nextLeads.length} empresas encontradas.`, data.demo ? "warning" : "success");
      if (autoEnrich) {
        const targets = nextLeads.filter((lead) => lead.website && !lead.email).slice(0, 8).map((lead) => ({ id: lead.id, website: lead.website }));
        if (targets.length) {
          fetch("/api/enrich", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targets, demo: Boolean(data.demo) }) })
            .then((response) => response.json()).then((enriched) => {
              const byId = new Map((enriched.results || []).map((item: { id: string }) => [item.id, item]));
              setLeads((current) => current.map((lead) => ({ ...lead, ...(byId.get(lead.id) || {}) })));
            }).catch(() => undefined);
        }
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Erro inesperado na pesquisa.", "error");
    } finally {
      setSearching(false);
      void refreshApiUsage();
    }
  }

  function toggleLead(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCurrentPage() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (pageFullySelected) paginatedLeads.forEach((lead) => next.delete(lead.id));
      else paginatedLeads.forEach((lead) => next.add(lead.id));
      return next;
    });
  }

  async function handleEnrich() {
    const base = selectedLeads.length ? selectedLeads : leads;
    const targets = base
      .filter((lead) => lead.website && !lead.email)
      .slice(0, 8)
      .map((lead) => ({ id: lead.id, website: lead.website }));

    if (!targets.length) {
      notify("Selecione empresas que possuam site e ainda não tenham e-mail.", "warning");
      return;
    }

    setEnriching(true);
    try {
      const response = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets, demo: isDemo }),
      });
      const data = (await response.json()) as {
        error?: string;
        results?: Array<{
          id: string;
          email: string;
          instagram: string;
          facebook: string;
          linkedin: string;
          error?: string;
        }>;
      };
      if (!response.ok) throw new Error(data.error || "Falha no enriquecimento.");
      const byId = new Map((data.results || []).map((result) => [result.id, result]));
      setLeads((current) =>
        current.map((lead) => {
          const result = byId.get(lead.id);
          return result
            ? {
                ...lead,
                email: result.email || lead.email,
                instagram: result.instagram || lead.instagram,
                facebook: result.facebook || lead.facebook,
                linkedin: result.linkedin || lead.linkedin,
              }
            : lead;
        }),
      );
      const found = (data.results || []).filter((result) => result.email || result.instagram).length;
      notify(`${found} contatos receberam novos dados públicos.`, "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Erro ao enriquecer os contatos.", "error");
    } finally {
      setEnriching(false);
    }
  }

  async function handleValidate() {
    const base = selectedLeads.length ? selectedLeads : leads;
    const candidates = base.filter(
      (lead) =>
        lead.phoneType === "mobile" &&
        lead.phoneE164 &&
        !["valid", "invalid"].includes(lead.whatsappStatus),
    );

    if (!candidates.length) {
      notify("Selecione números celulares que ainda estejam aguardando validação.", "warning");
      return;
    }

    setValidating(true);
    try {
      const allResults: Array<{ phone: string; status: "valid" | "invalid"; whatsappId?: string }> = [];
      let configured = false;
      for (let index = 0; index < candidates.length; index += 20) {
        const batch = candidates.slice(index, index + 20);
        const response = await fetch("/api/validate-whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phones: batch.map((lead) => lead.phoneE164),
            demo: isDemo,
          }),
        });
        const data = (await response.json()) as {
          error?: string;
          message?: string;
          configured?: boolean;
          results?: Array<{ phone: string; status: "valid" | "invalid"; whatsappId?: string }>;
        };
        if (!response.ok) {
          throw new Error(data.message || data.error || "Falha na validação de WhatsApp.");
        }
        configured = configured || Boolean(data.configured);
        allResults.push(...(data.results || []));
        if (!isDemo && index + 20 < candidates.length) await wait(1200);
      }

      const byPhone = new Map(allResults.map((result) => [normalizeDigits(result.phone), result]));
      setLeads((current) =>
        current.map((lead) => {
          const result = byPhone.get(normalizeDigits(lead.phoneE164));
          return result
            ? {
                ...lead,
                whatsappStatus: result.status,
                whatsappId: result.whatsappId || undefined,
              }
            : lead;
        }),
      );
      setValidatorConfigured(configured);
      const validCount = allResults.filter((result) => result.status === "valid").length;
      notify(
        `${validCount} de ${allResults.length} números foram confirmados${isDemo ? " na simulação" : ""}.`,
        "success",
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Erro ao validar os números.", "error");
      setSettingsOpen(true);
    } finally {
      setValidating(false);
    }
  }

  async function handleGenerateSamples() {
    const base = selectedLeads.length ? selectedLeads : leads.filter((lead) => websiteKind(lead) !== "own");
    const targets = base.filter((lead) => websiteKind(lead) !== "own").slice(0, 20);
    if (!targets.length) {
      notify("Selecione empresas sem site próprio.", "warning");
      return;
    }
    setGeneratingSamples(true);
    try {
      const response = await fetch("/api/samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: targets, template: sampleTemplate, primaryColor: sampleColor }),
      });
      const data = await response.json() as { samples?: SiteSample[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível gerar as amostras.");
      setSamples((current) => [...(data.samples || []), ...current]);
      setActiveView("samples");
      notify(`${data.samples?.length || 0} amostras criadas e prontas para revisão.`, "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao gerar amostras.", "error");
    } finally {
      setGeneratingSamples(false);
    }
  }

  function handleExport() {
    const source = selectedLeads.length ? selectedLeads : filteredLeads;
    if (!source.length) {
      notify("Não há contatos para exportar.", "warning");
      return;
    }

    const headers = [
      "Empresa",
      "Categoria",
      "Telefone",
      "Link WhatsApp",
      "Status WhatsApp",
      "E-mail",
      "Site",
      "Instagram",
      "Endereço",
      "Cidade",
      "Avaliação",
      "Quantidade de avaliações",
      "Google Maps",
    ];
    const rows = source.map((lead) => {
      const whatsappLink = getWhatsAppLink(lead);
      return [
        lead.name,
        lead.category,
        lead.phone,
        whatsappLink,
        STATUS_LABELS[lead.whatsappStatus],
        lead.email,
        lead.website,
        lead.instagram,
        lead.address,
        lead.city,
        lead.rating,
        lead.reviewCount,
        lead.googleMapsUrl,
      ];
    });
    const csv = `\uFEFF${[headers, ...rows]
      .map((row) => row.map((cell) => csvCell(cell)).join(";"))
      .join("\r\n")}`;
    const fileBase = getExportFileBase(source, activity, city);
    downloadTextFile(
      csv,
      `${fileBase}-excel-completo.csv`,
      "text/csv;charset=utf-8",
    );
    notify(`${source.length} contatos exportados para uma planilha compatível com Excel.`, "success");
  }

  function handleAgendaSpreadsheet() {
    const source = selectedLeads.length ? selectedLeads : filteredLeads;
    if (!source.length) {
      notify("Não há contatos para gerar a planilha da agenda.", "warning");
      return;
    }

    const headers = [
      "Nome para agenda",
      "Telefone",
      "Tipo de telefone",
      "Empresa",
      "Segmento pesquisado",
      "Categoria Google",
      "Cidade",
      "E-mail",
      "Link WhatsApp",
      "Status WhatsApp",
      "Site",
      "Instagram",
      "Endereço",
      "Avaliação",
      "Quantidade de avaliações",
      "Google Maps",
    ];
    const rows = source.map((lead) => [
      getAgendaName(lead, city, activity),
      getAgendaPhone(lead),
      lead.phoneType === "mobile" ? "Celular" : lead.phoneType === "landline" ? "Fixo" : "Telefone",
      lead.name,
      lead.searchSegment || activity,
      lead.category,
      lead.city || city,
      lead.email,
      getWhatsAppLink(lead),
      STATUS_LABELS[lead.whatsappStatus],
      lead.website,
      lead.instagram,
      lead.address,
      lead.rating,
      lead.reviewCount,
      lead.googleMapsUrl,
    ]);
    const csv = `\uFEFF${[headers, ...rows]
      .map((row) => row.map((cell) => csvCell(cell)).join(";"))
      .join("\r\n")}`;
    const fileBase = getExportFileBase(source, activity, city);
    downloadTextFile(
      csv,
      `${fileBase}-excel-agenda.csv`,
      "text/csv;charset=utf-8",
    );
    notify(
      `Planilha para agenda gerada com ${source.length} contatos e nomes organizados por cidade.`,
      "success",
    );
  }

  function handleAgendaFile() {
    const source = selectedLeads.length ? selectedLeads : filteredLeads;
    const contacts = source.filter((lead) => normalizeDigits(lead.phoneE164 || lead.phone).length >= 10);
    if (!contacts.length) {
      notify("Não há contatos com telefone para importar na agenda.", "warning");
      return;
    }

    const cards = contacts.map((lead) => {
      const agendaName = getAgendaName(lead, city, activity);
      const segment = lead.searchSegment || activity || lead.category;
      const phoneType = lead.phoneType === "mobile" ? "CELL" : "WORK,VOICE";
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN;CHARSET=UTF-8:${vCardText(agendaName)}`,
        `N;CHARSET=UTF-8:;${vCardText(agendaName)};;;`,
        `ORG;CHARSET=UTF-8:${vCardText(lead.name)}`,
        `TITLE;CHARSET=UTF-8:${vCardText(segment)}`,
        `TEL;TYPE=${phoneType}:${vCardText(getAgendaPhone(lead))}`,
      ];
      if (lead.email) lines.push(`EMAIL;TYPE=INTERNET:${vCardText(lead.email)}`);
      if (lead.address || lead.city) {
        lines.push(
          `ADR;CHARSET=UTF-8;TYPE=WORK:;;${vCardText(lead.address)};${vCardText(lead.city || city)};;;Brasil`,
        );
      }
      if (lead.website) lines.push(`URL:${vCardText(lead.website)}`);
      lines.push(`NOTE;CHARSET=UTF-8:Segmento pesquisado: ${vCardText(segment)}`);
      lines.push("END:VCARD");
      return lines.join("\r\n");
    });

    const fileBase = getExportFileBase(contacts, activity, city);
    downloadTextFile(
      `${cards.join("\r\n")}\r\n`,
      `${fileBase}-agenda.vcf`,
      "text/vcard;charset=utf-8",
    );
    const skipped = source.length - contacts.length;
    notify(
      `Arquivo de agenda criado com ${contacts.length} contatos${skipped ? `; ${skipped} sem telefone foram ignorados` : ""}.`,
      "success",
    );
  }

  function restoreHistory(item: SearchHistoryItem) {
    setActivity(item.activity);
    setCity(item.city);
    setRadius(item.radius);
    setLimit(item.limit);
    setActiveView("search");
    notify("Filtros restaurados. Clique em “Buscar empresas” para atualizar os dados.", "info");
  }

  function clearHistory() {
    setHistoryItems([]);
    window.localStorage.removeItem(HISTORY_KEY);
    notify("Histórico deste navegador apagado.", "info");
  }

  function changeView(view: View) {
    setActiveView(view);
    setCurrentPage(1);
    setMobileMenuOpen(false);
  }

  const navItems: Array<{ id: View; label: string; icon: React.ReactNode }> = [
    { id: "search", label: "Pesquisa", icon: <Search size={17} /> },
    { id: "contacts", label: "Contatos", icon: <Users size={17} /> },
    { id: "samples", label: "Amostras", icon: <LayoutTemplate size={17} /> },
    { id: "validation", label: "Validação", icon: <ShieldCheck size={17} /> },
    { id: "history", label: "Histórico", icon: <History size={17} /> },
    { id: "usage", label: "Uso da API", icon: <BarChart3 size={17} /> },
  ];

  const renderMetrics = () => (
    <section className="metrics-grid" aria-label="Resumo dos resultados">
      <MetricCard icon={<Store size={29} />} value={metrics.companies} label="empresas" tone="cyan" />
      <MetricCard icon={<Smartphone size={29} />} value={metrics.mobiles} label="celulares" tone="blue" />
      <MetricCard
        icon={<MessageCircleMore size={29} />}
        value={metrics.whatsapp}
        label="WhatsApp confirmado"
        tone="green"
      />
      <MetricCard icon={<Mail size={29} />} value={metrics.emails} label="e-mails" tone="violet" />
    </section>
  );

  const renderResultsTable = () => (
    <section className="results-panel">
      <div className="results-toolbar">
        <div className="results-title">
          <div>
            <span className="eyebrow">BASE ATUAL</span>
            <h2>Empresas encontradas</h2>
          </div>
          <span className="result-count">{filteredLeads.length} resultados</span>
        </div>

        <div className="toolbar-actions">
          <label className="result-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Pesquisar nos resultados</span>
            <input
              value={resultSearch}
              onChange={(event) => {
                setResultSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filtrar empresas..."
            />
          </label>
          <label className="sort-select">
            <ArrowDownUp size={15} aria-hidden="true" />
            <span className="sr-only">Ordenar resultados</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as Sort);
                setCurrentPage(1);
              }}
            >
              <option value="rating">Melhor avaliação</option>
              <option value="reviews">Mais avaliações</option>
              <option value="name">Nome A–Z</option>
            </select>
          </label>
        </div>
      </div>

      <div className="filter-row" aria-label="Filtros de contatos">
        {(
          [
            ["all", "Todos"],
            ["mobile", "Com celular"],
            ["valid", "WhatsApp"],
            ["pending", "A validar"],
            ["invalid", "Inválidos"],
            ["email", "Com e-mail"],
            ["own-site", `Sites próprios (${metrics.ownSites})`],
            ["social", `Redes sociais (${metrics.socialOnly})`],
            ["no-site", `Sem site (${metrics.noSites})`],
          ] as Array<[Filter, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            className={`filter-chip ${filter === id ? "active" : ""}`}
            onClick={() => {
              setFilter(id);
              setCurrentPage(1);
            }}
            type="button"
          >
            {filter === id && <Check size={13} aria-hidden="true" />}
            {label}
          </button>
        ))}
      </div>

      <div className="bulk-bar">
        <div className="selection-summary">
          <span>{selectedIds.size ? `${selectedIds.size} selecionados` : "Selecione contatos para ações em lote"}</span>
        </div>
        <div className="bulk-actions">
          <button className="button button-ghost" type="button" onClick={handleEnrich} disabled={enriching}>
            {enriching ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
            Enriquecer
          </button>
          <button className="button button-ghost" type="button" onClick={handleValidate} disabled={validating}>
            {validating ? <Loader2 className="spin" size={16} /> : <ShieldCheck size={16} />}
            Validar WhatsApp
          </button>
          <button className="button button-primary" type="button" onClick={handleGenerateSamples} disabled={generatingSamples}>
            {generatingSamples ? <Loader2 className="spin" size={16} /> : <LayoutTemplate size={16} />}
            Gerar amostras
          </button>
          <button className="button button-secondary" type="button" onClick={handleExport}>
            <FileSpreadsheet size={16} />
            Excel completo
          </button>
          <button className="button button-secondary" type="button" onClick={handleAgendaSpreadsheet}>
            <FileSpreadsheet size={16} />
            Excel para agenda
          </button>
          <button className="button button-agenda" type="button" onClick={handleAgendaFile}>
            <BookUser size={16} />
            Arquivo para agenda
          </button>
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th className="checkbox-cell">
                <input
                  type="checkbox"
                  checked={pageFullySelected}
                  onChange={toggleCurrentPage}
                  aria-label="Selecionar contatos desta página"
                />
              </th>
              <th>Empresa</th>
              <th>Telefone</th>
              <th>Link WhatsApp</th>
              <th className="optional-column">Cidade</th>
              <th>Avaliação</th>
              <th className="action-cell"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {paginatedLeads.map((lead) => {
              const whatsappLink = getWhatsAppLink(lead);
              return (
              <tr key={lead.id} className={`${selectedIds.has(lead.id) ? "selected-row" : ""} ${!normalizeDigits(lead.phoneE164 || lead.phone) ? "no-phone-row" : ""}`}>
                <td className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(lead.id)}
                    onChange={() => toggleLead(lead.id)}
                    aria-label={`Selecionar ${lead.name}`}
                  />
                </td>
                <td>
                  <div className="company-cell">
                    <span className="company-avatar" aria-hidden="true">
                      <Building2 size={17} />
                    </span>
                    <div>
                      <strong>{lead.name}</strong>
                      <span>{lead.category}</span>
                      <div className="contact-links">
                        {lead.email && <span><Mail size={12} />{lead.email}</span>}
                        {lead.website && (
                          <a href={lead.website} target="_blank" rel="noreferrer">
                            <Globe2 size={12} /> Site
                          </a>
                        )}
                        {lead.instagram && (
                          <a href={lead.instagram} target="_blank" rel="noreferrer">
                            <AtSign size={12} /> Instagram
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="phone-cell">
                    <span>{lead.phone || "Não informado"}</span>
                    <small>{lead.phoneType === "mobile" ? "celular" : lead.phoneType === "landline" ? "fixo" : "—"}</small>
                  </div>
                </td>
                <td>
                  <div className="whatsapp-link-cell">
                    {whatsappLink ? (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Abrir WhatsApp de ${lead.name}`}
                      >
                        Abrir conversa <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span>Sem número</span>
                    )}
                  </div>
                </td>
                <td className="optional-column">
                  <div className="city-cell"><MapPin size={14} />{lead.city}</div>
                </td>
                <td>
                  <div className="rating-cell">
                    <Star size={15} fill="currentColor" />
                    <strong>{lead.rating?.toFixed(1) || "—"}</strong>
                    <small>({lead.reviewCount})</small>
                  </div>
                </td>
                <td className="action-cell">
                  {lead.googleMapsUrl && (
                    <a
                      className="icon-button small"
                      href={lead.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Abrir ${lead.name} no Google Maps`}
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {!paginatedLeads.length && (
          <div className="empty-state">
            <FileSearch size={34} />
            <h3>Nenhum contato neste filtro</h3>
            <p>Altere os filtros ou faça uma nova pesquisa.</p>
          </div>
        )}
      </div>

      <footer className="table-footer">
        <span>
          Página {currentPage} de {totalPages}
        </span>
        <div className="pagination">
          <button
            className="icon-button small"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            aria-label="Página anterior"
          >
            <ChevronLeft size={17} />
          </button>
          <span>{currentPage}</span>
          <button
            className="icon-button small"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            aria-label="Próxima página"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </footer>
    </section>
  );

  return (
    <main className="app-shell">
      <header className="app-header">
        <button
          className="mobile-menu-button"
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label="Abrir menu"
          aria-expanded={mobileMenuOpen}
        >
          <Menu size={22} />
        </button>

        <button className="brand" type="button" onClick={() => changeView("search")}>
          <span className="brand-mark" aria-hidden="true">GM</span>
          <span>
            <strong>CRM Sites Prospecção</strong>
            <small>Leads e amostras comerciais</small>
          </span>
        </button>

        <nav className={mobileMenuOpen ? "open" : ""} aria-label="Navegação principal">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeView === item.id ? "active" : ""}
              onClick={() => changeView(item.id)}
            >
              {item.icon}
              {item.label}
              {item.id === "contacts" && leads.length > 0 && <span>{leads.length}</span>}
              {item.id === "validation" && validationMetrics.pending > 0 && (
                <span>{validationMetrics.pending}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <span className={`mode-pill ${isDemo ? "demo" : "live"}`}>
            <span />
            {isDemo ? "Demonstração" : "API conectada"}
          </span>
          <button
            className="icon-button"
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Ver integrações"
          >
            <Settings2 size={18} />
          </button>
          <div className="profile" title={userEmail || userName}>
            <span>{initials(userName)}</span>
            <div>
              <strong>{userName}</strong>
              <small>Acesso privado</small>
            </div>
          </div>
        </div>
      </header>

      <div className="app-content">
        {activeView === "search" && (
          <>
            <section className="page-intro">
              <div>
                <span className="eyebrow"><Sparkles size={13} /> PROSPECÇÃO INTELIGENTE</span>
                <h1>Encontre empresas e transforme resultados em contatos.</h1>
                <p>Pesquise por segmento e cidade, organize os números e valide o WhatsApp antes da abordagem.</p>
              </div>
              <div className="privacy-note"><LockKeyhole size={17} /><span>Ambiente privado<br /><small>somente sua equipe</small></span></div>
            </section>

            <form className="search-panel" onSubmit={handleSearch}>
              <label className="field field-wide">
                <span>Segmento ou atividade</span>
                <div className="input-shell">
                  <Store size={18} aria-hidden="true" />
                  <input
                    value={activity}
                    onChange={(event) => setActivity(event.target.value)}
                    placeholder="Ex.: lojas de materiais elétricos"
                    maxLength={100}
                  />
                  {activity && (
                    <button type="button" onClick={() => setActivity("")} aria-label="Limpar segmento"><X size={16} /></button>
                  )}
                </div>
              </label>

              <label className="field field-city">
                <span>Cidade</span>
                <div className="input-shell">
                  <MapPin size={18} aria-hidden="true" />
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Ex.: Rio Verde - GO"
                    maxLength={120}
                  />
                  {city && (
                    <button type="button" onClick={() => setCity("")} aria-label="Limpar cidade"><X size={16} /></button>
                  )}
                </div>
              </label>

              <label className="field field-small">
                <span>Raio</span>
                <div className="input-shell select-shell">
                  <SlidersHorizontal size={17} aria-hidden="true" />
                  <select value={radius} onChange={(event) => setRadius(Number(event.target.value))}>
                    <option value={5}>5 km</option>
                    <option value={10}>10 km</option>
                    <option value={20}>20 km</option>
                    <option value={30}>30 km</option>
                    <option value={50}>50 km</option>
                  </select>
                </div>
              </label>

              <label className="field field-small">
                <span>Por busca</span>
                <div className="input-shell select-shell">
                  <Users size={17} aria-hidden="true" />
                  <select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
                    <option value={20}>20 por busca</option>
                    <option value={40}>40 por busca</option>
                    <option value={60}>60 por busca</option>
                  </select>
                </div>
              </label>

              <button className="search-button" type="submit" disabled={searching}>
                {searching ? <Loader2 className="spin" size={20} /> : <Search size={20} />}
                {searching ? "Executando 4 buscas..." : "Buscar empresas"}
              </button>
              <label className="auto-enrich"><input type="checkbox" checked={autoEnrich} onChange={(event) => setAutoEnrich(event.target.checked)} /><Sparkles size={15} /><span>Enriquecer automaticamente os resultados</span></label>
              <p className="search-helper">São feitas 4 buscas novas e sequenciais, sem cache. Somente empresas cujo endereço confirme a cidade e a UF informadas são mantidas; repetições e resultados de outras cidades são descartados.</p>
            </form>

            {renderMetrics()}
            {renderResultsTable()}
          </>
        )}

        {activeView === "contacts" && (
          <>
            <section className="section-heading">
              <div><span className="eyebrow">CONTATOS</span><h1>Base de empresas</h1><p>Filtre, selecione e exporte os contatos coletados.</p></div>
              <button className="button button-primary" type="button" onClick={() => changeView("search")}><Search size={16} /> Nova pesquisa</button>
            </section>
            {renderMetrics()}
            {renderResultsTable()}
          </>
        )}

        {activeView === "samples" && (
          <>
            <section className="section-heading">
              <div><span className="eyebrow"><LayoutTemplate size={13} /> AMOSTRAS DE SITES</span><h1>Sites prontos para apresentar</h1><p>Gere, revise e acompanhe cada oportunidade até a conversão em site definitivo.</p></div>
              <button className="button button-primary" type="button" onClick={() => changeView("contacts")}><Users size={16} /> Selecionar empresas</button>
            </section>

            <section className="sample-builder">
              <div><Palette size={22} /><div><strong>Configuração automática</strong><span>Aplicada às próximas amostras selecionadas</span></div></div>
              <label><span>Estilo</span><select value={sampleTemplate} onChange={(event) => setSampleTemplate(event.target.value)}><option value="moderno">Moderno</option><option value="empresarial">Empresarial</option><option value="sofisticado">Sofisticado</option><option value="direto">Simples e direto</option></select></label>
              <label><span>Cor principal</span><input type="color" value={sampleColor} onChange={(event) => setSampleColor(event.target.value)} /></label>
              <button className="button button-primary" type="button" onClick={handleGenerateSamples} disabled={generatingSamples}>{generatingSamples ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />} Gerar selecionadas</button>
            </section>

            <section className="sample-stats">
              <article><strong>{samples.length}</strong><span>Amostras criadas</span></article>
              <article><strong>{samples.filter((item) => item.pipelineStatus === "pronto_revisar").length}</strong><span>Para revisar</span></article>
              <article><strong>{samples.reduce((total, item) => total + item.views, 0)}</strong><span>Visualizações</span></article>
              <article><strong>{samples.filter((item) => item.pipelineStatus === "convertido").length}</strong><span>Convertidas</span></article>
            </section>

            <section className="samples-grid">
              {samples.map((sample) => (
                <article className="sample-card" key={sample.id}>
                  <div className="sample-preview" style={{ "--sample-color": sample.primaryColor } as React.CSSProperties}><span>{sample.companyName}</span><div /><div /><small>Site demonstrativo</small></div>
                  <div className="sample-card-body"><span className="sample-status">{sample.pipelineStatus.replaceAll("_", " ")}</span><h3>{sample.companyName}</h3><p>{sample.segment} · {sample.city}</p><div className="sample-card-meta"><span>{sample.views} visualizações</span><span>{formatDate(sample.createdAt)}</span></div></div>
                  <footer><a className="button button-ghost" href={`/amostra/${sample.slug}`} target="_blank"><ExternalLink size={15} /> Visualizar</a>{sample.phone && <a className="button button-primary" href={`https://wa.me/${sample.phone.replace(/\D/g, "")}`} target="_blank"><MessageCircleMore size={15} /> Apresentar</a>}</footer>
                </article>
              ))}
              {!samples.length && <div className="empty-state large"><LayoutTemplate size={42} /><h2>Nenhuma amostra criada</h2><p>Selecione empresas sem site próprio e clique em “Gerar amostras”.</p><button className="button button-primary" onClick={() => changeView("contacts")}><Users size={16} /> Abrir contatos</button></div>}
            </section>
          </>
        )}

        {activeView === "validation" && (
          <>
            <section className="section-heading">
              <div><span className="eyebrow">VALIDAÇÃO</span><h1>Qualidade dos números</h1><p>Separe os celulares confirmados no WhatsApp antes de exportar.</p></div>
              <button className="button button-primary" type="button" onClick={handleValidate} disabled={validating}>
                {validating ? <Loader2 className="spin" size={16} /> : <ShieldCheck size={16} />}
                Validar pendentes
              </button>
            </section>

            <section className="validation-grid">
              <article className="validation-card valid"><CheckCircle2 /><strong>{validationMetrics.valid}</strong><span>Confirmados</span></article>
              <article className="validation-card pending"><Clock3 /><strong>{validationMetrics.pending}</strong><span>Aguardando</span></article>
              <article className="validation-card invalid"><XCircle /><strong>{validationMetrics.invalid}</strong><span>Não encontrados</span></article>
              <article className="validation-card neutral"><Phone /><strong>{validationMetrics.landline}</strong><span>Telefones fixos</span></article>
            </section>

            <section className="validator-info">
              <div className="validator-illustration"><MessageCircleMore size={38} /></div>
              <div>
                <span className="eyebrow">COMO FUNCIONA</span>
                <h2>Validação em lotes controlados</h2>
                <p>Os celulares são normalizados no padrão internacional e consultados em lotes de até 20. Números fixos ficam separados automaticamente.</p>
              </div>
              <span className={`integration-status ${validatorConfigured ? "connected" : "waiting"}`}>
                {validatorConfigured ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
                {validatorConfigured ? "Whapi conectada" : isDemo ? "Simulação ativa" : "Integração pendente"}
              </span>
            </section>
            {renderResultsTable()}
          </>
        )}

        {activeView === "history" && (
          <>
            <section className="section-heading">
              <div><span className="eyebrow">HISTÓRICO LOCAL</span><h1>Pesquisas recentes</h1><p>Registros salvos somente neste navegador.</p></div>
              {historyItems.length > 0 && <button className="button button-danger" type="button" onClick={clearHistory}><X size={16} /> Limpar histórico</button>}
            </section>
            <section className="history-panel">
              {historyItems.length ? (
                historyItems.map((item) => (
                  <article className="history-card" key={item.id}>
                    <span className="history-icon"><History size={19} /></span>
                    <div className="history-main"><strong>{item.activity}</strong><span><MapPin size={13} />{item.city} · {item.radius} km</span></div>
                    <div className="history-meta"><strong>{item.resultCount}</strong><span>resultados</span></div>
                    <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                    <button className="button button-ghost" type="button" onClick={() => restoreHistory(item)}><Search size={15} /> Repetir</button>
                  </article>
                ))
              ) : (
                <div className="empty-state large"><History size={42} /><h2>Nenhuma pesquisa salva</h2><p>Suas próximas pesquisas aparecerão aqui neste dispositivo.</p><button className="button button-primary" type="button" onClick={() => changeView("search")}><Search size={16} /> Fazer pesquisa</button></div>
              )}
            </section>
          </>
        )}

        {activeView === "usage" && (
          <>
            <section className="section-heading">
              <div>
                <span className="eyebrow"><BarChart3 size={13} /> CONSUMO ESTIMADO</span>
                <h1>Uso da Google Places API</h1>
                <p>Acompanhe as chamadas registradas por este aplicativo e o valor estimado da franquia gratuita utilizada.</p>
              </div>
              <button
                className="button button-primary"
                type="button"
                onClick={() => void refreshApiUsage(true)}
                disabled={usageLoading}
              >
                <RefreshCw className={usageLoading ? "spin" : ""} size={16} />
                Atualizar consumo
              </button>
            </section>

            {usageLoading && !apiUsage ? (
              <section className="usage-empty" aria-live="polite">
                <Loader2 className="spin" size={28} />
                <span>Calculando o consumo registrado...</span>
              </section>
            ) : apiUsage ? (
              <>
                <section className="usage-counter-grid" aria-label="Contadores de solicitações da API">
                  <article className="usage-counter usage-counter-daily">
                    <header>
                      <div>
                        <span className="usage-counter-icon"><Clock3 size={18} /></span>
                        <span>Solicitações hoje</span>
                      </div>
                      <strong>{apiUsage.daily.totalRequests.toLocaleString("pt-BR")}</strong>
                    </header>
                    <div className="usage-counter-explanation">
                      <strong>Uso diário registrado</strong>
                      <span>
                        A Places API (New) não possui uma franquia gratuita diária universal.
                        A cota diária ativa é configurada diretamente no projeto Google Cloud.
                      </span>
                    </div>
                    <footer>
                      <span>{apiUsage.daily.searches.toLocaleString("pt-BR")} pesquisas hoje</span>
                      <a href={apiUsage.quotaManagementSource} target="_blank" rel="noreferrer">
                        Ver cota ativa <ExternalLink size={11} />
                      </a>
                    </footer>
                  </article>

                  <article className="usage-counter usage-counter-monthly">
                    <header>
                      <div>
                        <span className="usage-counter-icon"><BarChart3 size={18} /></span>
                        <span>Franquias gratuitas no mês</span>
                      </div>
                      <span className="usage-counter-month">{formatMonth(apiUsage.month)}</span>
                    </header>
                    <div className="usage-free-sku-list">
                      {apiUsage.skus.map((sku) => (
                        <div className={`usage-free-sku ${sku.freeRemaining === 0 ? "limit-reached" : ""}`} key={`counter-${sku.id}`}>
                          <div>
                            <span>{sku.name}</span>
                            <strong>
                              {sku.requests.toLocaleString("pt-BR")}
                              <small>/</small>
                              {sku.freeCap.toLocaleString("pt-BR")}
                            </strong>
                          </div>
                          <div
                            className="usage-counter-progress"
                            role="progressbar"
                            aria-label={`Franquia gratuita utilizada em ${sku.name}`}
                            aria-valuemin={0}
                            aria-valuemax={sku.freeCap}
                            aria-valuenow={Math.min(sku.requests, sku.freeCap)}
                          >
                            <span style={{ width: `${sku.freePercent}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <footer>
                      <span>Limites independentes por categoria</span>
                      <strong>Valores oficiais do Google</strong>
                    </footer>
                  </article>
                </section>

                <section className="usage-summary-grid" aria-label="Resumo do uso da API">
                  <article className="usage-stat usage-stat-cyan">
                    <span>Pesquisas no mês</span>
                    <strong>{apiUsage.searches.toLocaleString("pt-BR")}</strong>
                    <small>{formatMonth(apiUsage.month)}</small>
                  </article>
                  <article className="usage-stat usage-stat-blue">
                    <span>Chamadas ao Google</span>
                    <strong>{apiUsage.totalRequests.toLocaleString("pt-BR")}</strong>
                    <small>{apiUsage.lifetime.totalRequests.toLocaleString("pt-BR")} desde o início do controle</small>
                  </article>
                  <article className="usage-stat usage-stat-violet">
                    <span>Crédito gratuito usado</span>
                    <strong>{formatUsd(apiUsage.freeCreditValueUsedUsd)}</strong>
                    <small>de {formatUsd(apiUsage.freeCreditValueLimitUsd)} estimados</small>
                  </article>
                  <article className="usage-stat usage-stat-green">
                    <span>Custo após franquia</span>
                    <strong>{formatUsd(apiUsage.estimatedPaidCostUsd)}</strong>
                    <small>valor bruto: {formatUsd(apiUsage.grossListValueUsd)}</small>
                  </article>
                </section>

                <section className="usage-panel">
                  <header>
                    <div>
                      <span className="eyebrow">DETALHAMENTO</span>
                      <h2>Franquias por categoria de consulta</h2>
                    </div>
                    <span className="usage-updated">
                      {apiUsage.updatedAt ? `Atualizado em ${formatDate(apiUsage.updatedAt)}` : "Aguardando a primeira busca"}
                    </span>
                  </header>

                  <div className="usage-sku-list">
                    {apiUsage.skus.map((sku) => (
                      <article className="usage-sku" key={sku.id}>
                        <div className="usage-sku-heading">
                          <div>
                            <strong>{sku.name}</strong>
                            <span>{sku.description}</span>
                          </div>
                          <div className="usage-sku-count">
                            <strong>{sku.requests.toLocaleString("pt-BR")}</strong>
                            <span>chamadas</span>
                          </div>
                        </div>
                        <div
                          className="usage-progress"
                          role="progressbar"
                          aria-label={`Franquia utilizada em ${sku.name}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(sku.freePercent)}
                        >
                          <span style={{ width: `${sku.freePercent}%` }} />
                        </div>
                        <div className="usage-sku-meta">
                          <span>{sku.freeUsed.toLocaleString("pt-BR")} de {sku.freeCap.toLocaleString("pt-BR")} chamadas gratuitas usadas</span>
                          <span>{sku.freeRemaining.toLocaleString("pt-BR")} restantes</span>
                          <span>{formatUsd(sku.estimatedPaidCostUsd)} estimados após a franquia</span>
                        </div>
                      </article>
                    ))}
                  </div>

                  <footer className="usage-note">
                    <BarChart3 size={18} />
                    <div>
                      <strong>Estimativa deste aplicativo</strong>
                      <p>
                        {apiUsage.disclaimer} A contagem diária reinicia automaticamente à
                        meia-noite, no horário de São Paulo.
                      </p>
                      <a href={apiUsage.pricingSource} target="_blank" rel="noreferrer">
                        Ver preços oficiais utilizados <ExternalLink size={12} />
                      </a>
                      <a href={apiUsage.usageLimitsSource} target="_blank" rel="noreferrer">
                        Ver regras oficiais de cota <ExternalLink size={12} />
                      </a>
                    </div>
                  </footer>
                </section>
              </>
            ) : (
              <section className="usage-empty">
                <BarChart3 size={30} />
                <span>Não foi possível carregar o consumo. Use “Atualizar consumo” para tentar novamente.</span>
              </section>
            )}
          </>
        )}
      </div>

      {settingsOpen && (
        <div className="drawer-layer" role="dialog" aria-modal="true" aria-labelledby="integration-title">
          <button className="drawer-backdrop" onClick={() => setSettingsOpen(false)} aria-label="Fechar integrações" />
          <aside className="settings-drawer">
            <header><div><span className="eyebrow">CONFIGURAÇÃO</span><h2 id="integration-title">Integrações</h2></div><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Fechar"><X size={19} /></button></header>
            <p className="drawer-copy">As credenciais ficam protegidas no servidor e nunca são enviadas ao navegador.</p>
            <div className="integration-list">
              <article>
                <span className="integration-icon google"><MapPin size={20} /></span>
                <div><strong>Google Places API</strong><small>Pesquisa de empresas, telefones, sites e avaliações.</small></div>
                <span className={`connection-dot ${googleConfigured ? "ok" : "pending"}`}>{googleConfigured ? "Conectada" : "Pendente"}</span>
              </article>
              <article>
                <span className="integration-icon whapi"><MessageCircleMore size={20} /></span>
                <div><strong>Whapi.Cloud</strong><small>Confirma se o celular possui uma conta no WhatsApp.</small></div>
                <span className={`connection-dot ${validatorConfigured ? "ok" : "pending"}`}>{validatorConfigured ? "Conectada" : "Pendente"}</span>
              </article>
              <article>
                <span className="integration-icon enrichment"><Link2 size={20} /></span>
                <div><strong>Enriquecimento web</strong><small>Procura e-mails e redes sociais nos sites públicos.</small></div>
                <span className="connection-dot ok">Ativo</span>
              </article>
              <article>
                <span className="integration-icon private"><LockKeyhole size={20} /></span>
                <div><strong>Acesso da equipe</strong><small>O aplicativo está protegido por autenticação.</small></div>
                <span className="connection-dot ok">Privado</span>
              </article>
            </div>
            <div className="drawer-callout"><Settings2 size={18} /><p>Para ativar dados reais, configure uma chave restrita do Google Places e um token da Whapi.Cloud no ambiente seguro do aplicativo.</p></div>
          </aside>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.tone}`} role="status">
          {toast.tone === "success" ? <CheckCircle2 size={18} /> : toast.tone === "error" ? <XCircle size={18} /> : <Sparkles size={18} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Fechar aviso"><X size={15} /></button>
        </div>
      )}
    </main>
  );
}
