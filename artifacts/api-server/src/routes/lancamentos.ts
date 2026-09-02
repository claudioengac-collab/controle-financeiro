// api-server/src/routes/lancamentos.ts
//
// Atualizado para suportar 3 estados: ATIVO, ARQUIVADO e LIXEIRA.
// - "Excluir" no app agora manda para a lixeira (recuperável).
// - Da lixeira dá pra "Restaurar" ou "Excluir definitivamente" (sem volta).

import { Router } from "express";
import { query } from "../lib/db";

const router = Router();

const SELECT_COLS = `
  id, vencimento, descricao, natureza,
  parcela_atual   AS "parcelaAtual",
  total_parcelas  AS "totalParcelas",
  valor::float    AS valor,
  pago, mes,
  grupo_id        AS "grupoId",
  criado_por_id   AS "criadoPorId"
`;

// Listar lançamentos ativos (não arquivados, não excluídos)
router.get("/lancamentos", async (_req, res) => {
  try {
    const rows = await query(`
      SELECT ${SELECT_COLS}
      FROM lancamentos
      WHERE arquivado IS NOT TRUE AND excluido_em IS NULL
      ORDER BY mes, vencimento
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: String(err) });
  }
});

// Listar lançamentos arquivados
router.get("/lancamentos/arquivados", async (_req, res) => {
  try {
    const rows = await query(`
      SELECT ${SELECT_COLS}
      FROM lancamentos
      WHERE arquivado = TRUE AND excluido_em IS NULL
      ORDER BY mes, vencimento
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: String(err) });
  }
});

// 🆕 Listar lançamentos na lixeira
router.get("/lancamentos/lixeira", async (_req, res) => {
  try {
    const rows = await query(`
      SELECT ${SELECT_COLS}, excluido_em AS "excluidoEm"
      FROM lancamentos
      WHERE excluido_em IS NOT NULL
      ORDER BY excluido_em DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: String(err) });
  }
});

// Arquivar múltiplos lançamentos
router.patch("/lancamentos/arquivar", async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.json({ ok: true });
  try {
    await query(`UPDATE lancamentos SET arquivado = TRUE WHERE id = ANY($1)`, [ids]);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ erro: String(err) });
  }
});

// Criar lançamentos em lote
router.post("/lancamentos", async (req, res) => {
  const items: any[] = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.json({ ok: true });
  try {
    // 🆕 Insere todas as parcelas em UM ÚNICO comando, em vez de um loop
    // com uma consulta por parcela. Isso evita a situação em que algumas
    // parcelas eram salvas e outras não caso algo desse errado no meio do
    // caminho — agora ou salva tudo, ou nada (evita lançamento incompleto).
    const colunas = 11;
    const valoresSql: string[] = [];
    const params: any[] = [];
    items.forEach((l, i) => {
      const base = i * colunas;
      valoresSql.push(
        `(${Array.from({ length: colunas }, (_, j) => `$${base + j + 1}`).join(",")})`
      );
      params.push(
        l.id, l.vencimento, l.descricao, l.natureza,
        l.parcelaAtual, l.totalParcelas, l.valor, l.pago, l.mes, l.grupoId, l.criadoPorId ?? null
      );
    });

    await query(
      `INSERT INTO lancamentos
         (id, vencimento, descricao, natureza, parcela_atual, total_parcelas, valor, pago, mes, grupo_id, criado_por_id)
       VALUES ${valoresSql.join(",")}
       ON CONFLICT (id) DO NOTHING`,
      params
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao criar lançamentos:", err);
    return res.status(500).json({ erro: String(err) });
  }
});

// Atualizar lançamento
router.put("/lancamentos/:id", async (req, res) => {
  const { vencimento, descricao, natureza, parcelaAtual, totalParcelas, valor, pago, mes, grupoId } = req.body;
  try {
    await query(
      `UPDATE lancamentos SET
         vencimento=$1, descricao=$2, natureza=$3, parcela_atual=$4,
         total_parcelas=$5, valor=$6, pago=$7, mes=$8, grupo_id=$9,
         atualizado_em = now()
       WHERE id=$10`,
      [vencimento, descricao, natureza, parcelaAtual, totalParcelas, valor, pago, mes, grupoId, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: String(err) });
  }
});

// 🆕 Excluir (agora vai para a lixeira — recuperável)
router.patch("/lancamentos/:id/excluir", async (req, res) => {
  try {
    await query(`UPDATE lancamentos SET excluido_em = now() WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: String(err) });
  }
});

// 🆕 Excluir DEFINITIVAMENTE — só deve ser chamado a partir da tela de Lixeira
router.delete("/lancamentos/:id", async (req, res) => {
  try {
    await query(`DELETE FROM lancamentos WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: String(err) });
  }
});

// Marcar pago / desmarcar
router.patch("/lancamentos/:id/pago", async (req, res) => {
  const { pago } = req.body;
  try {
    await query(`UPDATE lancamentos SET pago=$1 WHERE id=$2`, [pago, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: String(err) });
  }
});

// Restaurar lançamento (da lixeira OU do arquivo) para ativo
router.patch("/lancamentos/:id/restaurar", async (req, res) => {
  try {
    await query(
      `UPDATE lancamentos SET arquivado = FALSE, excluido_em = NULL WHERE id = $1`,
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: String(err) });
  }
});

export default router;
