-- ============================================================================
-- Migração: Controle Financeiro
-- Segura para rodar em banco NOVO (cria tudo do zero) ou em banco EXISTENTE
-- com dados reais (só adiciona o que estiver faltando, nunca apaga nada).
--
-- Como rodar: cole este arquivo inteiro no painel "Database" do Replit
-- (aba SQL runner) e execute, OU rode via psql apontando para a DATABASE_URL.
-- ============================================================================

-- Tabela de usuários (cria só se não existir)
CREATE TABLE IF NOT EXISTS usuarios (
  id             TEXT PRIMARY KEY,
  nome_completo  TEXT NOT NULL,
  email          TEXT NOT NULL,
  senha          TEXT NOT NULL,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de lançamentos (cria só se não existir)
CREATE TABLE IF NOT EXISTS lancamentos (
  id              TEXT PRIMARY KEY,
  descricao       TEXT NOT NULL,
  vencimento      TEXT NOT NULL,
  natureza        TEXT NOT NULL,
  parcela_atual   INTEGER NOT NULL DEFAULT 1,
  total_parcelas  INTEGER NOT NULL DEFAULT 1,
  valor           NUMERIC(12,2) NOT NULL,
  pago            BOOLEAN NOT NULL DEFAULT FALSE,
  mes             TEXT NOT NULL,
  grupo_id        TEXT NOT NULL,
  arquivado       BOOLEAN NOT NULL DEFAULT FALSE
);

-- Caso a tabela já exista (ambiente de produção atual), garante as colunas novas:
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS arquivado       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS excluido_em     TIMESTAMPTZ;              -- 🆕 lixeira
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS criado_por_id   TEXT;                       -- 🆕 auditoria (opcional)
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS criado_em       TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now();

-- Índices para acelerar as listagens mais comuns
CREATE INDEX IF NOT EXISTS idx_lancamentos_mes        ON lancamentos (mes);
CREATE INDEX IF NOT EXISTS idx_lancamentos_grupo       ON lancamentos (grupo_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_ativos      ON lancamentos (arquivado, excluido_em);
