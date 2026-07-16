import { resolveWhatsappSendCredentials } from "./apiConfig";

export type WhatsappConnectionProbeResult = {
  ok: boolean;
  /** Mensagem curta em português para o dono da loja */
  message: string;
};

function friendlyHttpError(status: number): string {
  if (status === 401 || status === 403) {
    return "Token ou senha incorretos. Confira e tente de novo.";
  }
  if (status === 404) {
    return "Instância ou ID não encontrado. Confira o nome da conta.";
  }
  if (status >= 500) {
    return "O serviço de WhatsApp está instável agora. Tente de novo em alguns minutos.";
  }
  return `Não consegui validar a conexão (código ${status}). Confira os dados.`;
}

function friendlyNetworkError(err: unknown): string {
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("econnrefused")) {
    return "Não consegui falar com o endereço informado. Confira a URL.";
  }
  return "Não consegui validar a conexão. Confira os dados e tente de novo.";
}

/**
 * Testa se as credenciais do WhatsApp respondem de verdade (sem enviar mensagem).
 */
export async function probeWhatsappConnection(
  tenantId: string,
): Promise<WhatsappConnectionProbeResult> {
  const creds = await resolveWhatsappSendCredentials(tenantId);
  if (!creds) {
    return {
      ok: false,
      message: "Preencha URL, instância e token, e ligue o envio de mensagens.",
    };
  }

  const { provider, baseUrl, apiKey, instance } = creds;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    if (provider === "zapi") {
      const res = await fetch(`${baseUrl}/instances/${instance}/token/${apiKey}/status`, {
        method: "GET",
        signal: controller.signal,
      });
      if (res.ok) {
        return { ok: true, message: "Conexão ok — o WhatsApp respondeu." };
      }
      // Alguns planos Z-API usam outro path; se 404, tenta status-instance
      if (res.status === 404) {
        const res2 = await fetch(
          `${baseUrl}/instances/${instance}/token/${apiKey}/status-instance`,
          { method: "GET", signal: controller.signal },
        );
        if (res2.ok) {
          return { ok: true, message: "Conexão ok — o WhatsApp respondeu." };
        }
        return { ok: false, message: friendlyHttpError(res2.status) };
      }
      return { ok: false, message: friendlyHttpError(res.status) };
    }

    if (provider === "cloud") {
      const res = await fetch(`${baseUrl}/v21.0/${instance}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      });
      if (res.ok) {
        return { ok: true, message: "Conexão ok — a Meta respondeu." };
      }
      return { ok: false, message: friendlyHttpError(res.status) };
    }

    // Evolution API
    const res = await fetch(`${baseUrl}/instance/connectionState/${instance}`, {
      method: "GET",
      headers: { apikey: apiKey },
      signal: controller.signal,
    });
    if (res.ok) {
      return { ok: true, message: "Conexão ok — o WhatsApp respondeu." };
    }
    if (res.status === 404) {
      // Fallback: listar instâncias com o mesmo token
      const res2 = await fetch(`${baseUrl}/instance/fetchInstances`, {
        method: "GET",
        headers: { apikey: apiKey },
        signal: controller.signal,
      });
      if (res2.ok) {
        return {
          ok: true,
          message: "Token ok. Confira se o nome da instância está certo se as mensagens falharem.",
        };
      }
      return { ok: false, message: friendlyHttpError(res2.status) };
    }
    return { ok: false, message: friendlyHttpError(res.status) };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        message: "O serviço demorou demais para responder. Confira a URL.",
      };
    }
    return { ok: false, message: friendlyNetworkError(err) };
  } finally {
    clearTimeout(timeout);
  }
}
