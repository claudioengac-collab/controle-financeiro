# Código completo — Controle Financeiro

Este pacote contém o código-fonte do aplicativo Expo, da API Express e das bibliotecas compartilhadas do monorepo.

## Estrutura principal

- `artifacts/controle-financeiro`: aplicativo mobile/web Expo
- `artifacts/api-server`: API Express + PostgreSQL
- `lib/api-spec`: especificação OpenAPI
- `lib/api-client-react`: cliente compartilhado gerado
- `lib/api-zod`: tipos/validações compartilhados
- `lib/db`: configuração e schema do banco

## Desenvolvimento

1. Instale Node.js e pnpm.
2. Execute `pnpm install` na raiz.
3. Configure `DATABASE_URL` no ambiente da API.
4. Inicie a API com `pnpm --filter @workspace/api-server run dev`.
5. Em outro terminal, inicie o Expo com `pnpm --filter @workspace/controle-financeiro run dev`.

Os dados do banco e os valores de secrets não fazem parte deste arquivo.
