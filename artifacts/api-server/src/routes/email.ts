import { Router } from "express";
import { Resend } from "resend";

const router = Router();

const resend = new Resend(process.env.RESEND_API_KEY);

// 🆕 Sem domínio próprio verificado no Resend, só dá pra mandar pro
// e-mail usado pra criar a conta no Resend. Deixe esse único endereço aqui.
const DESTINATARIOS = ["claudioeng.ac@gmail.com"];

router.post("/email/notificar", async (req, res) => {
  try {
    const { acao, descricao, valor, natureza, mes, parcelas, usuario } = req.body;

    const acaoTexto: Record<string, string> = {
      criar: "Novo lançamento criado",
      editar: "Lançamento editado",
      excluir: "Lançamento excluído",
    };

    const naturezaTexto = natureza === "RECEITA" ? "Receita" : "Despesa";
    const cor = natureza === "RECEITA" ? "#2E7D32" : "#C62828";
    const titulo = acaoTexto[acao] ?? "Atualização de lançamento";

    const valorFormatado = Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
        <div style="background:#1A237E;padding:20px;text-align:center">
          <h2 style="color:#fff;margin:0">App Controle Financeiro</h2>
        </div>
        <div style="padding:24px">
          <h3 style="color:${cor};margin-top:0">${titulo}</h3>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#555;width:40%">Descrição</td><td style="padding:8px 0;font-weight:bold">${descricao}</td></tr>
            <tr><td style="padding:8px 0;color:#555">Tipo</td><td style="padding:8px 0;color:${cor};font-weight:bold">${naturezaTexto}</td></tr>
            <tr><td style="padding:8px 0;color:#555">Valor</td><td style="padding:8px 0;font-weight:bold">${valorFormatado}</td></tr>
            <tr><td style="padding:8px 0;color:#555">Mês</td><td style="padding:8px 0">${mes}</td></tr>
            ${parcelas > 1 ? `<tr><td style="padding:8px 0;color:#555">Parcelas</td><td style="padding:8px 0">${parcelas}x</td></tr>` : ""}
            ${usuario ? `<tr><td style="padding:8px 0;color:#555">Usuário</td><td style="padding:8px 0">${usuario}</td></tr>` : ""}
          </table>
        </div>
        <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:12px;color:#888">
          Notificação automática — App Controle Financeiro
        </div>
      </div>
    `;

    // 🆕 Resend em vez de SMTP/nodemailer — o Render bloqueia conexões
    // SMTP tradicionais no plano grátis, mas isso aqui funciona por HTTPS,
    // que nunca é bloqueado.
    const { error } = await resend.emails.send({
      from: "Controle Financeiro <onboarding@resend.dev>",
      to: DESTINATARIOS,
      subject: `${titulo}: ${descricao} — ${valorFormatado}`,
      html,
    });

    if (error) {
      console.error("Erro ao enviar e-mail (Resend):", error);
      return res.status(500).json({ ok: false, erro: error.message });
    }

    res.json({ ok: true });
  } catch (err: any) {
    console.error("Erro ao enviar e-mail:", err?.message);
    res.status(500).json({ ok: false, erro: err?.message });
  }
});

export default router;
