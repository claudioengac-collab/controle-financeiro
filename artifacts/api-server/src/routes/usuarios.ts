import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../lib/db";

const router = Router();

// Listar todos os usuários (⚠️ nunca devolve a senha/hash)
router.get("/usuarios", async (_req, res) => {
  try {
    const rows = await query(
      `SELECT id, nome_completo as "nomeCompleto", email, criado_em as "criadoEm" FROM usuarios ORDER BY criado_em`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: String(err) });
  }
});

// Criar usuário — senha sempre criptografada antes de gravar
router.post("/usuarios", async (req, res) => {
  const { id, nomeCompleto, email, senha, criadoEm } = req.body;
  try {
    const senhaHash = await bcrypt.hash(String(senha), 10);
    await query(
      `INSERT INTO usuarios (id, nome_completo, email, senha, criado_em) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [id, nomeCompleto, email ?? "", senhaHash, criadoEm]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: String(err) });
  }
});

// Excluir usuário
router.delete("/usuarios/:id", async (req, res) => {
  try {
    await query(`DELETE FROM usuarios WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: String(err) });
  }
});

export default router;
