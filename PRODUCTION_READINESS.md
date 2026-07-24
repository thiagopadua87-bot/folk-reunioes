# Production Readiness — v1.0.0

**Avaliado em:** 2026-07-24
**Commit:** `65297caccfa8ee3d26e69612df970fde116b693a`

---

## Arquitetura

**Status: Pronta**

- Next.js App Router com separação clara de Server Components / Client Components
- Camada de domínio isolada (`lib/engenharia-comercial/`) — sem acesso direto ao Supabase nos componentes
- Rotas de API com cliente server-side (sem exposição da service role key ao browser)
- Utilitários de KPI centralizados em `kpi-utils.ts` — sem implementações duplicadas
- Build limpo: 0 erros TypeScript, 76/76 testes passando

**Limitações conhecidas:**
- Migrations não usam timestamps Supabase (nome alfabético garante a ordem, mas não é o padrão CLI)
- Sem testes de integração E2E automatizados

---

## Banco de Dados

**Status: Pronto**

- 45 migrations idempotentes (`IF NOT EXISTS`, `DROP IF EXISTS`)
- 22 tabelas EC com constraints, triggers e FK corretos
- `ec_versoes.necessita_recalculo` criado na fase5 (antes dos indexes)
- `ec_parametros_financeiros` com 19 parâmetros semeados na fase3
- Views: `ec_visao_executiva` (KPIs computados), `ec_solucao_itens_view`
- Triggers SECURITY DEFINER: `ec_log_versao_status`, `ec_sync_versao_status_from_precificacao`
- Indexes de performance: `proposta_id`, `versao_id`, `necessita_recalculo` (partial)

**Limitações conhecidas:**
- `ec_visao_executiva` usa CROSS JOIN com `ec_parametros_financeiros` — se o parâmetro `periodo_roi_meses` for deletado, a view retorna 0 linhas por versão. Monitorar.
- `ec_enforce_single_current_version` não é SECURITY DEFINER — bypass via UPDATE direto no banco (não via app)

---

## Segurança

**Status: Pronta**

- RLS habilitado em todas as tabelas EC e de sistema
- Políticas por operação (INSERT/UPDATE/DELETE/SELECT) com subquery de ownership explícita
- `rls_security_patch.sql` elimina o gap de políticas `FOR ALL USING(true)` da fase4
- Migration chain idempotente: dropa `*_escreve_autenticados` E `*_escreve_owner` antes de recriar
- `SUPABASE_SERVICE_ROLE_KEY` usada apenas server-side (rotas de API)
- `is_admin()` como função auxiliar de RLS
- Sistema de permissões por tela (`screen_permissions`) com validação server-side

**Riscos conhecidos:**
- `ec_enforce_single_current_version` não é SECURITY DEFINER: usuário com acesso direto ao banco pode criar múltiplas versões `is_current = true`. Risco baixo em produção (acesso via app)
- Chaves de API estão no `.env.local` — confirmar que não foram commitadas no repositório

---

## Performance

**Status: Adequada para piloto**

- Indexes em `proposta_id` e `versao_id` em todas as tabelas filhas EC
- Partial index em `ec_versoes(proposta_id, necessita_recalculo) WHERE necessita_recalculo = true`
- Lazy-load por sub-aba em Comissões
- Indexes de inadimplência

**Limitações conhecidas:**
- Sem paginação server-side no Pipeline (carrega todos os leads ativos)
- Módulo EC sem paginação na listagem de propostas
- Sem cache de queries (sem React Query ou SWR)
- Dashboard Comercial executa múltiplas queries em paralelo — pode ser lento com volume alto

**Recomendações pós-piloto:**
- Monitorar latência de queries via Supabase → Logs → API após 2 semanas de uso
- Adicionar paginação ao Pipeline se ultrapassar 200 leads ativos

---

## Exportações

**Status: Prontas**

- PDF Executivo: `@react-pdf/renderer` via rota de API — autenticação server-side correta
- PDF Técnico: BOM completo, memorial de engenharia, precificação detalhada
- Excel: `SheetJS (xlsx)` via rota de API — todas as abas da proposta
- Payback: implementação unificada em `kpi-utils.ts` (Math.round, alinhado com SQL ROUND())
- Custo mensal: corrigido no Dashboard Executivo (não há mais double-count)

---

## UX

**Status: Adequada para piloto**

- Fluxo completo EC testado: catálogo → proposta → necessidades → cálculo → PDF → Excel
- RecalcularBanner: alerta visual quando escopo foi alterado após cálculo
- Responsivo: sidebar colapsável, grid adaptativo
- BDI e impostos exibidos como percentual nos cards de custo (ponto de melhoria, não bloqueador)
- Feedback de loading em todas as ações assíncronas pesadas

**Pontos de melhoria identificados (pós-piloto):**
- `PrecificacaoTab`: BDI e impostos exibidos como valor absoluto quando deveriam ser percentuais
- Sem confirmação explícita de "proposta enviada ao cliente"

---

## Observabilidade

**Status: Adequada para piloto (com ressalvas)**

Logs encontrados:
- `SessionWatcher.tsx`: logs detalhados `[SessionWatcher]` no ciclo de auth — mantidos intencionalmente para diagnóstico durante o piloto
- `PipelineTab.tsx`: logs de performance `[Pipeline]` com `performance.now()` — verbose mas inofensivos
- `lib/supabase.ts`: warnings de requisição lenta/timeout — observabilidade intencional
- Rotas de API EC: `console.error` nos `catch` — adequados para rastreamento de erros server-side

Nenhum TODO, FIXME ou HACK identificado na codebase.

**Recomendação:** remover logs de debug `[SessionWatcher]` e `[Pipeline]` na v1.1 após confirmar estabilidade do auth e performance do Pipeline.

---

## Riscos Conhecidos

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|---------------|---------|-----------|
| R1 | `periodo_roi_meses` deletado de `ec_parametros_financeiros` | Baixa | Alto | Não expor CRUD de parâmetros ao usuário comum |
| R2 | Versões `is_current` duplicadas por acesso direto ao banco | Muito baixa | Médio | Acesso ao banco restrito ao admin técnico |
| R3 | Latência alta em Pipeline com volume de leads > 200 | Média | Baixo | Adicionar paginação na v1.1 |
| R4 | Google Calendar falha silenciosamente se service account inválido | Média | Baixo | Erro já tratado com try/catch |

---

## Limitações Conhecidas

1. **Sem paginação** no Pipeline e na listagem de propostas EC
2. **Sem testes E2E automatizados** — smoke tests manuais necessários após cada deploy
3. **PDF gerado server-side** — em projetos com muitas linhas de BOM, a geração pode demorar >10s
4. **Sem notificações** — aprovação de margem e mudança de status não enviam e-mail/push
5. **Migrations sem timestamp** — não compatível com `supabase db push` padrão sem adaptação

---

## Veredicto

**Apto para Produção (piloto)**

O sistema está tecnicamente estável para um piloto controlado. As quatro vulnerabilidades bloqueadoras foram corrigidas. Build, tipagem e testes passam sem erros. As limitações identificadas são aceitáveis para validação inicial com usuários reais e não comprometem a integridade dos dados nem a segurança da plataforma.

Recomendação operacional: congelar novas funcionalidades por 2–4 semanas após o deploy do piloto. Coletar apenas bugs, dificuldades dos usuários e oportunidades de melhoria. Abrir nova versão (v1.1 ou v2.0) somente com base em evidências de uso real.
