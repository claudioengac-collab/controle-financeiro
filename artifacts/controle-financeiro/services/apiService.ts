// URL base da API — funciona em web, Android e iPhone
export function getApiBase(): string {
  // 🆕 Fora do Replit (Render, Vercel etc.), a URL da API vem de uma variável
  // definida no momento do build do app: EXPO_PUBLIC_API_URL.
  // Ex.: EXPO_PUBLIC_API_URL=https://seu-api.onrender.com/api
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Esquema antigo, específico do Replit (mantido pra quem ainda testa por lá)
  if (typeof window !== "undefined" && window?.location?.hostname) {
    const root = window.location.hostname.includes(".expo.")
      ? window.location.hostname.replace(".expo.", ".")
      : window.location.hostname;
    return `https://${root}/api`;
  }
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
  return `https://${domain}/api`;
}

async function req<T = any>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${getApiBase()}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const detalhe = await res.text();
      throw new Error(
        detalhe ? `Erro ${res.status}: ${detalhe}` : `Erro ${res.status} ao acessar o servidor`
      );
    }
    return res.json();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("O servidor demorou para responder. Tente novamente.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Usuários ──────────────────────────────────────────────────────────────────
export const api = {
  getUsuarios: () => req("GET", "/usuarios"),
  postUsuario: (u: any) => req("POST", "/usuarios", u),
  deleteUsuario: (id: string) => req("DELETE", `/usuarios/${id}`),
  login: (nome: string, senha: string) =>
    req<{ ok: boolean; erro?: string; usuario?: any }>("POST", "/auth/login", { nome, senha }),

  // ── Lançamentos ─────────────────────────────────────────────────────────────
  getLancamentos: () => req("GET", "/lancamentos"),
  getLancamentosArquivados: () => req("GET", "/lancamentos/arquivados"),
  getLancamentosLixeira: () => req("GET", "/lancamentos/lixeira"),           // 🆕
  postLancamentos: (items: any[]) => req("POST", "/lancamentos", items),
  putLancamento: (id: string, data: any) => req("PUT", `/lancamentos/${id}`, data),
  excluirLancamento: (id: string) => req("PATCH", `/lancamentos/${id}/excluir`), // 🆕 vai pra lixeira
  excluirDefinitivo: (id: string) => req("DELETE", `/lancamentos/${id}`),        // 🆕 sem volta
  patchPago: (id: string, pago: boolean) =>
    req("PATCH", `/lancamentos/${id}/pago`, { pago }),
  patchArquivar: (ids: string[]) =>
    req("PATCH", "/lancamentos/arquivar", { ids }),
  patchRestaurar: (id: string) =>
    req("PATCH", `/lancamentos/${id}/restaurar`),
};
