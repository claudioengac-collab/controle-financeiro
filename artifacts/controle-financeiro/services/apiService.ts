// URL base da API — funciona em web, Android e iPhone
export function getApiBase(): string {
  // 🆕 No Render, a própria página repassa (proxy) /api/* pro servidor de
  // verdade — configurado direto no render.yaml. Por isso um caminho
  // relativo já basta: nunca "cruza" pra outro site, então não tem como
  // dar problema de conexão entre domínios diferentes.
  if (typeof window !== "undefined" && window?.location?.hostname?.includes("onrender.com")) {
    return "/api";
  }

  // Fora do Render (ex.: rodando localmente), ainda dá pra forçar um
  // endereço específico via variável de ambiente, se precisar.
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
  body?: unknown,
  tentativa: number = 0
): Promise<T> {
  const url = `${getApiBase()}${path}`;
  const controller = new AbortController();
  // 🆕 60s em vez de 15s — o plano grátis do Render pode levar mais de 25s
  // pra "acordar" o servidor quando ele está dormindo.
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    // 🆕 Enquanto o servidor está "acordando", o Render devolve uma
    // página de carregamento (HTML), não o JSON esperado. Detecta isso
    // e tenta de novo automaticamente, em vez de mostrar erro pro usuário.
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      if (tentativa < 3) {
        await new Promise((r) => setTimeout(r, 6000));
        return req<T>(method, path, body, tentativa + 1);
      }
      throw new Error("O servidor ainda está iniciando. Tente novamente em instantes.");
    }

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
