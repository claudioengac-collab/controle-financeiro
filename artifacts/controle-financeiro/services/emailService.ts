export type AcaoEmail = "criar" | "editar" | "excluir";

interface DadosEmail {
  acao: AcaoEmail;
  descricao: string;
  valor: number;
  natureza: "RECEITA" | "DESPESA";
  mes: string;
  parcelas?: number;
  usuario?: string;
}

function getApiUrl(): string {
  // 🆕 Mesma lógica do apiService.ts: no Render, a própria página repassa
  // /api/* pro servidor de verdade — caminho relativo já basta.
  if (typeof window !== "undefined" && window?.location?.hostname?.includes("onrender.com")) {
    return "/api";
  }
  // Na web (esquema antigo do Replit): usa o hostname do browser, removendo ".expo." do meio
  if (typeof window !== "undefined" && window?.location?.hostname) {
    const h = window.location.hostname;
    const root = h.includes(".expo.") ? h.replace(".expo.", ".") : h;
    return `https://${root}/api`;
  }
  // Mobile nativo: usa a variável de ambiente
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
  return `https://${domain}/api`;
}

export async function enviarNotificacao(dados: DadosEmail): Promise<void> {
  const url = `${getApiUrl()}/email/notificar`;
  console.log("[email] enviando →", url);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    const json = await res.json();
    console.log("[email] ok →", JSON.stringify(json));
  } catch (err) {
    console.error("[email] erro →", String(err));
  }
}
