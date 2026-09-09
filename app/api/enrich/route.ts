export const runtime = "edge";

type EnrichmentTarget = {
  id?: unknown;
  website?: unknown;
};

type EnrichmentResult = {
  id: string;
  email: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  error?: string;
};

const MAX_TARGETS = 8;
const MAX_HTML_BYTES = 900_000;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "127.0.0.1" ||
    host === "::1"
  ) {
    return true;
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const octets = ipv4.slice(1).map(Number);
  if (octets.some((value) => value > 255)) return true;
  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    octets[0] === 0
  );
}

function validatePublicUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Endereço de site inválido.");
  }
  if (url.username || url.password || isPrivateHostname(url.hostname)) {
    throw new Error("Endereço de site não permitido.");
  }
  return url;
}

async function fetchHtml(rawUrl: string) {
  let url = validatePublicUrl(rawUrl);

  for (let redirect = 0; redirect < 4; redirect += 1) {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "GM-Web-Extractor/1.0 (+contact-enrichment)",
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirecionamento inválido.");
      url = validatePublicUrl(new URL(location, url).toString());
      continue;
    }

    if (!response.ok) throw new Error(`Site respondeu com status ${response.status}.`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error("O endereço não contém uma página HTML.");
    }
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_HTML_BYTES) throw new Error("Página muito grande para análise.");
    const html = await response.text();
    return html.slice(0, MAX_HTML_BYTES);
  }

  throw new Error("O site possui redirecionamentos demais.");
}

function cleanEmail(value: string) {
  return decodeURIComponent(value)
    .replace(/^mailto:/i, "")
    .split("?")[0]
    .trim()
    .toLowerCase();
}

function findEmail(html: string) {
  const candidates = [
    ...Array.from(html.matchAll(/mailto:([^"'<>?\s]+)/gi), (match) => cleanEmail(match[1])),
    ...(html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map(cleanEmail),
  ];
  return (
    candidates.find(
      (email) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
        !/\.(png|jpe?g|gif|webp|svg)$/i.test(email) &&
        !email.includes("example.com"),
    ) || ""
  );
}

function findSocial(html: string, domain: string) {
  const escaped = domain.replaceAll(".", "\\.");
  const regex = new RegExp(
    `https?:\\/\\/(?:www\\.)?${escaped}\\/[^"'<>\\s&]+`,
    "i",
  );
  return (html.match(regex)?.[0] || "").replace(/[),.;]+$/, "");
}

async function enrichTarget(target: { id: string; website: string }): Promise<EnrichmentResult> {
  try {
    const html = await fetchHtml(target.website);
    return {
      id: target.id,
      email: findEmail(html),
      instagram: findSocial(html, "instagram.com"),
      facebook: findSocial(html, "facebook.com"),
      linkedin: findSocial(html, "linkedin.com"),
    };
  } catch (error) {
    return {
      id: target.id,
      email: "",
      instagram: "",
      facebook: "",
      linkedin: "",
      error: error instanceof Error ? error.message : "Falha ao consultar o site.",
    };
  }
}

export async function POST(request: Request) {
  let body: { targets?: EnrichmentTarget[]; demo?: boolean };
  try {
    body = (await request.json()) as { targets?: EnrichmentTarget[]; demo?: boolean };
  } catch {
    return json({ error: "Envie uma solicitação válida." }, 400);
  }

  const targets = (Array.isArray(body.targets) ? body.targets : [])
    .map((target) => ({
      id: typeof target.id === "string" ? target.id.slice(0, 180) : "",
      website: typeof target.website === "string" ? target.website.slice(0, 500) : "",
    }))
    .filter((target) => target.id && target.website)
    .slice(0, MAX_TARGETS);

  if (!targets.length) {
    return json({ error: "Selecione empresas que possuam site." }, 400);
  }

  if (body.demo) {
    return json({
      demo: true,
      results: targets.map((target, index) => ({
        id: target.id,
        email: `contato${index + 1}@empresa-demo.com.br`,
        instagram: "https://instagram.com/empresa_demo",
        facebook: "",
        linkedin: "",
      })),
    });
  }

  const results = await Promise.all(targets.map(enrichTarget));
  return json({ demo: false, results });
}
