# Release Checklist — v1.0.0

**Versão:** 1.0.0
**Data:** 2026-07-24
**Branch:** main
**Commit:** `65297caccfa8ee3d26e69612df970fde116b693a`

---

## 1. Migrations

Execute em ordem alfabética (o nome dos arquivos garante a sequência correta):

| # | Arquivo | Módulo |
|---|---------|--------|
| 1 | `add_assembleia_ultima_interacao.sql` | Pipeline |
| 2 | `add_autor_nome_obra_logs.sql` | Obras |
| 3 | `add_carta_arquivo_gestao_crise.sql` | Operacional |
| 4 | `add_carta_cancelamento_gestao_crise.sql` | Operacional |
| 5 | `add_cnpj_to_gestao_crise_and_clientes_perdidos.sql` | Operacional |
| 6 | `add_cnpj_to_pipeline.sql` | Pipeline |
| 7 | `add_comissoes.sql` | Comissões |
| 8 | `add_competitors.sql` | Pipeline |
| 9 | `add_crise_id_clientes_perdidos.sql` | Operacional |
| 10 | `add_crisis_actions.sql` | Operacional |
| 11 | `add_dashboard_cobranca_rpc.sql` | Cobrança |
| 12 | `add_dashboard_comercial_v2.sql` | Comercial |
| 13 | `add_fechado_ganho_to_pipeline_status.sql` | Pipeline |
| 14 | `add_inadimplencia_indexes.sql` | Inadimplência |
| 15 | `add_inadimplencia_module.sql` | Inadimplência |
| 16 | `add_indicadores.sql` | Cadastros |
| 17 | `add_meta_anual.sql` | Comercial |
| 18 | `add_motivos_perda.sql` | Pipeline |
| 19 | `add_pipeline_competitor_fields.sql` | Pipeline |
| 20 | `add_pipeline_lixeira.sql` | Pipeline |
| 21 | `add_pipeline_lixeira_restore_policy.sql` | Pipeline |
| 22 | `add_promocao_gestao_crise.sql` | Operacional |
| 23 | `add_revertido_nivel_risco.sql` | Operacional |
| 24 | `add_screen_permissions.sql` | Admin |
| 25 | `add_sindicos_gestores.sql` | Cadastros |
| 26 | `add_user_profiles_system.sql` | Admin |
| 27 | `add_valor_contrato_gestao_crise.sql` | Operacional |
| 28 | `add_winner_competitor_to_clientes_perdidos.sql` | Operacional |
| 29 | `ajustes_reunioes_v2.sql` | Reuniões |
| 30 | `engenharia_comercial_fase1_catalogo.sql` | EC — Catálogo |
| 31 | `engenharia_comercial_fase2_motor.sql` | EC — Motor |
| 32 | `engenharia_comercial_fase3_configuracao.sql` | EC — Configuração |
| 33 | `engenharia_comercial_fase4_proposta.sql` | EC — Proposta |
| 34 | `engenharia_comercial_fase5_necessita_recalculo.sql` | EC — Flag recálculo |
| 35 | `engenharia_comercial_performance_indexes.sql` | EC — Indexes |
| 36 | `engenharia_comercial_rls_ownership.sql` | EC — RLS base |
| 37 | `engenharia_comercial_rls_security_patch.sql` | EC — RLS hardening |
| 38 | `fix_rls_cadastros_team_visibility.sql` | Cadastros |
| 39 | `fix_rls_operacional_team_visibility.sql` | Operacional |
| 40 | `kanban_pipeline_upgrade.sql` | Pipeline |
| 41 | `redesign_reunioes_v2.sql` | Reuniões |
| 42 | `remove_fechado_from_pipeline_status.sql` | Pipeline |
| 43 | `split_valor_aproximado_pipeline.sql` | Pipeline |
| 44 | `split_valor_vendas.sql` | Comercial |
| 45 | `update_andamento_check_constraint.sql` | Obras |

> **Atenção:** As migrations EC (30–37) têm dependência sequencial estrita.
> O nome garante a ordem: `fase1` < `fase2` < `fase3` < `fase4` < `fase5` < `performance` < `rls_ownership` < `rls_security_patch`.

---

## 2. Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (anon) | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (uso server-side) | Sim |
| `GOOGLE_CALENDAR_CLIENT_EMAIL` | E-mail do service account Google | Opcional |
| `GOOGLE_CALENDAR_PRIVATE_KEY` | Chave privada RSA (PEM, sem aspas extras) | Opcional |
| `GOOGLE_CALENDAR_ID` | ID do calendário Google alvo | Opcional |

> As variáveis Google Calendar são obrigatórias apenas se a integração de calendário estiver ativa.

---

## 3. Build

- [ ] `npm run build` conclui sem erros
- [ ] `npx tsc --noEmit` → 0 erros TypeScript
- [ ] `npx vitest run` → 76/76 testes passando

---

## 4. Testes Pré-Deploy

### Automatizados
- [ ] 76 testes unitários passando (motor EC, precificação, composição, formatters)
- [ ] TypeScript sem erros de compilação

### Manuais — Módulo EC
- [ ] Criar proposta → preencher dados → calcular → revisar KPIs no Dashboard Executivo
- [ ] Gerar PDF Executivo: payback, custo mensal e margem corretos
- [ ] Gerar PDF Técnico: BOM completo, payback correto
- [ ] Exportar Excel: planilha com estrutura completa
- [ ] Aprovação de versão: transição de status funciona

### Manuais — Sistema
- [ ] Login com usuário admin
- [ ] Login com usuário não-admin (verifica permissões de tela)
- [ ] Sessão expira → redireciona para /login sem travamento
- [ ] Pipeline: criar/mover/excluir lead
- [ ] TV: painel atualiza sem erros

---

## 5. Checklist de Deploy

- [ ] Backup do banco executado e verificado (ver DEPLOY.md § Backup)
- [ ] Migrations executadas em ordem (via Supabase Studio ou CLI)
- [ ] Health check passou: `/admin/health` → todos os itens verdes
- [ ] Variáveis de ambiente configuradas na plataforma de hospedagem
- [ ] Build de produção deployado
- [ ] DNS/domínio apontando para o novo deploy
- [ ] Smoke test pós-deploy: login → EC → PDF

---

## 6. Checklist de Rollback

- [ ] Snapshot do banco (pré-deploy) disponível e acessível
- [ ] Commit anterior identificado: `03ba36a`
- [ ] Procedimento de rollback documentado (ver DEPLOY.md § Rollback)
- [ ] Estimativa de janela de rollback: ≤ 30 minutos
