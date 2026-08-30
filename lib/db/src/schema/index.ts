// lib/db/src/schema/index.ts
//
// Schema Drizzle que espelha o banco PostgreSQL real do projeto.
// Antes deste arquivo, o schema estava vazio — a tabela `lancamentos`
// e `usuarios` já existiam no banco (criadas manualmente em algum
// momento), mas o Drizzle não sabia que elas existiam.
//
// Isso significa: se você provisionar um banco novo do zero, rodar
// `pnpm --filter @workspace/db run push` com este arquivo cria as
// duas tabelas automaticamente, com toda a estrutura certa.

import { pgTable, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── usuarios ──────────────────────────────────────────────────────────────
export const usuariosTable = pgTable("usuarios", {
  id: text("id").primaryKey(),
  nomeCompleto: text("nome_completo").notNull(),
  email: text("email").notNull(),
  // Guarda o hash bcrypt da senha (nunca texto puro). Usuários antigos com
  // senha em texto puro são migrados automaticamente no primeiro login
  // depois desta atualização (ver api-server/src/routes/auth.ts).
  senha: text("senha").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUsuarioSchema = createInsertSchema(usuariosTable).omit({ criadoEm: true });
export type InsertUsuario = z.infer<typeof insertUsuarioSchema>;
export type Usuario = typeof usuariosTable.$inferSelect;

// ── lancamentos ───────────────────────────────────────────────────────────
export const lancamentosTable = pgTable("lancamentos", {
  id: text("id").primaryKey(),
  descricao: text("descricao").notNull(),
  // Guardado como texto "DD/MM/AAAA" (compatível com os dados existentes).
  // Ver relatório: migrar para tipo `date` é uma melhoria futura opcional.
  vencimento: text("vencimento").notNull(),
  natureza: text("natureza").notNull(), // "RECEITA" | "DESPESA"
  parcelaAtual: integer("parcela_atual").notNull().default(1),
  totalParcelas: integer("total_parcelas").notNull().default(1),
  valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
  pago: boolean("pago").notNull().default(false),
  mes: text("mes").notNull(), // "MM/AAAA"
  grupoId: text("grupo_id").notNull(),

  // Arquivo (já existia em produção)
  arquivado: boolean("arquivado").notNull().default(false),

  // 🆕 Lixeira: NULL = ativo/arquivado normalmente.
  // Com data/hora = está na lixeira, recuperável até ser excluído de vez.
  excluidoEm: timestamp("excluido_em", { withTimezone: true }),

  // 🆕 Auditoria — opcional, mas recomendado
  criadoPorId: text("criado_por_id"), // referencia usuarios.id (sem FK estrita, para não travar inserts)
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLancamentoSchema = createInsertSchema(lancamentosTable).omit({
  criadoEm: true,
  atualizadoEm: true,
});
export type InsertLancamento = z.infer<typeof insertLancamentoSchema>;
export type Lancamento = typeof lancamentosTable.$inferSelect;
