import { Router } from "express";
import bcrypt from "bcryptjs";
import { query, queryOne } from "../lib/db";

const router = Router();

function pareceHash(valor: string): boolean {
  // Hashes bcrypt sempre começam com $2a$, $2b$ ou $2y$
  return /^\$2[aby]\$/.test(valor);
}

// Login — validado no servidor. Nunca devolve a senha/hash pro cliente.
router.post("/auth/login", async (req, res) => {
  const { nome, senha } = req.body ?? {};
  if (!nome || !senha) {
    return res.status(400).json({ ok: false, erro: "Informe nome e senha." });
  }

  try {
    const usuario = await queryOne<{
      id: string;
      nomeCompleto: string;
      email: string;
      senha: string;
      criadoEm: string;
    }>(
      `SELECT id, nome_completo AS "nomeCompleto", email, senha, criado_em AS "criadoEm"
       FROM usuarios
       WHERE LOWER(TRIM(nome_completo)) = LOWER(TRIM($1))`,
      [nome]
    );

    if (!usuario) {
      return res.status(401).json({ ok: false, erro: "Nome ou senha inválidos." });
    }

    let autenticado = false;

    if (pareceHash(usuario.senha)) {
      // Senha já está com hash — caminho normal
      autenticado = await bcrypt.compare(senha, usuario.senha);
    } else {
      // 🔄 Migração automática: usuário antigo, senha ainda em texto puro.
      // Se bater, criptografa agora e substitui no banco — só acontece uma vez por usuário.
      if (usuario.senha === senha) {
        autenticado = true;
        const novoHash = await bcrypt.hash(senha, 10);
        await query(`UPDATE usuarios SET senha = $1 WHERE id = $2`, [novoHash, usuario.id]);
      }
    }

    if (!autenticado) {
      return res.status(401).json({ ok: false, erro: "Nome ou senha inválidos." });
    }

    // Nunca devolver a senha/hash pro app
    const { senha: _omit, ...usuarioSeguro } = usuario;
    return res.json({ ok: true, usuario: usuarioSeguro });
  } catch (err) {
    return res.status(500).json({ ok: false, erro: String(err) });
  }
});

export default router;
