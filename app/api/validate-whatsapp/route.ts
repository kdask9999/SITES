export const runtime = "edge";

type WhapiContact = {
  input?: string;
  status?: string;
  wa_id?: string;
};

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function normalizePhone(value: unknown) {
  let digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`;
  }
  return digits.length >= 12 && digits.length <= 13 ? digits : "";
}

export async function POST(request: Request) {
  let body: { phones?: unknown[]; demo?: boolean };
  try {
    body = (await request.json()) as { phones?: unknown[]; demo?: boolean };
  } catch {
    return json({ error: "Envie uma solicitação válida." }, 400);
  }

  const phones = Array.from(
    new Set((Array.isArray(body.phones) ? body.phones : []).map(normalizePhone).filter(Boolean)),
  ).slice(0, 20);

  if (!phones.length) {
    return json({ error: "Nenhum número celular válido foi selecionado." }, 400);
  }

  if (body.demo) {
    return json({
      configured: false,
      demo: true,
      results: phones.map((phone, index) => ({
        phone,
        status: index % 4 === 3 ? "invalid" : "valid",
        whatsappId: index % 4 === 3 ? "" : phone,
      })),
      message: "Validação simulada no modo demonstração.",
    });
  }

  const token = process.env.WHAPI_TOKEN?.trim();
  if (!token) {
    return json(
      {
        error: "WHAPI_NOT_CONFIGURED",
        message: "Conecte um token da Whapi.Cloud para validar números reais.",
      },
      503,
    );
  }

  try {
    const response = await fetch("https://gate.whapi.cloud/contacts", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        blocking: "wait",
        force_check: true,
        contacts: phones,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    const payload = (await response.json()) as {
      contacts?: WhapiContact[];
      error?: { message?: string };
      message?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error?.message || payload.message || `Erro ${response.status}`);
    }

    const results = (payload.contacts || []).map((contact) => ({
      phone: normalizePhone(contact.input),
      status: contact.status === "valid" ? "valid" : "invalid",
      whatsappId: contact.status === "valid" ? contact.wa_id || normalizePhone(contact.input) : "",
    }));

    return json({
      configured: true,
      demo: false,
      results,
      message: `${results.filter((result) => result.status === "valid").length} números confirmados no WhatsApp.`,
    });
  } catch (error) {
    return json(
      {
        error: "WHAPI_REQUEST_FAILED",
        message:
          error instanceof Error ? error.message : "Não foi possível validar os números.",
      },
      502,
    );
  }
}
