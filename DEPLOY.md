# Guia de Implantação — v1.0.0

---

## Visão Geral

| Item | Valor |
|------|-------|
| Plataforma | Next.js App Router (Node.js 18+) |
| Banco de dados | Supabase (PostgreSQL 15) |
| Hospedagem recomendada | Vercel |
| Tempo estimado de deploy | 20–40 minutos |
| Janela de manutenção recomendada | Madrugada ou fim de semana |

---

## 1. Backup (executar ANTES do deploy)

### 1.1 Via Supabase Dashboard

1. Acesse **Supabase → Settings → Database → Backups**
2. Clique em **Download backup** (backup físico de último ponto)
3. Anote o timestamp do backup no RELEASE_CHECKLIST.md

### 1.2 Via CLI (recomendado para backup incremental)

```bash
# Requer supabase CLI e acesso ao projeto
supabase db dump --db-url "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  -f backup_pre_v1.0.0_$(date +%Y%m%d_%H%M%S).sql
```

### 1.3 Verificar o backup

```bash
# Confirmar que o arquivo está íntegro e contém as tabelas esperadas
grep -c "CREATE TABLE\|INSERT INTO" backup_pre_v1.0.0_*.sql
# Espera-se centenas de linhas — um arquivo pequeno indica falha
```

---

## 2. Banco de Dados

### 2.1 Executar migrations

Acesse **Supabase → SQL Editor** e execute cada arquivo em ordem alfabética:

```
supabase/migrations/add_assembleia_ultima_interacao.sql
supabase/migrations/add_autor_nome_obra_logs.sql
supabase/migrations/add_carta_arquivo_gestao_crise.sql
supabase/migrations/add_carta_cancelamento_gestao_crise.sql
supabase/migrations/add_cnpj_to_gestao_crise_and_clientes_perdidos.sql
supabase/migrations/add_cnpj_to_pipeline.sql
supabase/migrations/add_comissoes.sql
supabase/migrations/add_competitors.sql
supabase/migrations/add_crise_id_clientes_perdidos.sql
supabase/migrations/add_crisis_actions.sql
supabase/migrations/add_dashboard_cobranca_rpc.sql
supabase/migrations/add_dashboard_comercial_v2.sql
supabase/migrations/add_fechado_ganho_to_pipeline_status.sql
supabase/migrations/add_inadimplencia_indexes.sql
supabase/migrations/add_inadimplencia_module.sql
supabase/migrations/add_indicadores.sql
supabase/migrations/add_meta_anual.sql
supabase/migrations/add_motivos_perda.sql
supabase/migrations/add_pipeline_competitor_fields.sql
supabase/migrations/add_pipeline_lixeira.sql
supabase/migrations/add_pipeline_lixeira_restore_policy.sql
supabase/migrations/add_promocao_gestao_crise.sql
supabase/migrations/add_revertido_nivel_risco.sql
supabase/migrations/add_screen_permissions.sql
supabase/migrations/add_sindicos_gestores.sql
supabase/migrations/add_user_profiles_system.sql
supabase/migrations/add_valor_contrato_gestao_crise.sql
supabase/migrations/add_winner_competitor_to_clientes_perdidos.sql
supabase/migrations/ajustes_reunioes_v2.sql
supabase/migrations/engenharia_comercial_fase1_catalogo.sql
supabase/migrations/engenharia_comercial_fase2_motor.sql
supabase/migrations/engenharia_comercial_fase3_configuracao.sql
supabase/migrations/engenharia_comercial_fase4_proposta.sql
supabase/migrations/engenharia_comercial_fase5_necessita_recalculo.sql   ← CRÍTICO: rodar antes de performance_indexes
supabase/migrations/engenharia_comercial_performance_indexes.sql
supabase/migrations/engenharia_comercial_rls_ownership.sql
supabase/migrations/engenharia_comercial_rls_security_patch.sql          ← CRÍTICO: rodar por último entre as EC
supabase/migrations/fix_rls_cadastros_team_visibility.sql
supabase/migrations/fix_rls_operacional_team_visibility.sql
supabase/migrations/kanban_pipeline_upgrade.sql
supabase/migrations/redesign_reunioes_v2.sql
supabase/migrations/remove_fechado_from_pipeline_status.sql
supabase/migrations/split_valor_aproximado_pipeline.sql
supabase/migrations/split_valor_vendas.sql
supabase/migrations/update_andamento_check_constraint.sql
```

> Todas as migrations são idempotentes (`IF NOT EXISTS`, `DROP IF EXISTS`). Se o banco já tiver parte das tabelas, as migrations não causarão falha.

### 2.2 Validar o banco

Após as migrations, execute no SQL Editor:

```sql
-- Verificar tabelas EC principais
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'ec_%'
ORDER BY table_name;
-- Deve retornar 22 linhas

-- Verificar coluna crítica
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'ec_versoes'
  AND column_name = 'necessita_recalculo';
-- Deve retornar 1 linha: boolean, false

-- Verificar parâmetros financeiros semeados
SELECT chave, valor FROM public.ec_parametros_financeiros ORDER BY chave;
-- Deve retornar 19 linhas

-- Verificar views
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('ec_visao_executiva', 'ec_solucao_itens_view');
-- Deve retornar 2 linhas

-- Verificar RLS ativa
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'ec_%'
  AND rowsecurity = false;
-- Deve retornar 0 linhas (RLS ativa em todas)
```

### 2.3 Rollback do banco

```sql
-- Caso seja necessário reverter as migrations EC após uma falha:
-- 1. Restaurar o backup pré-deploy (ver § Restaurar Backup)
-- 2. NÃO execute DROP manual — restaure o snapshot completo
```

---

## 3. Aplicação

### 3.1 Variáveis de ambiente

Configure no painel do hosting (Vercel → Settings → Environment Variables):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[SEU-PROJETO].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]

# Opcional — integração Google Calendar
GOOGLE_CALENDAR_CLIENT_EMAIL=[email@serviceaccount.com]
GOOGLE_CALENDAR_PRIVATE_KEY=[-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----]
GOOGLE_CALENDAR_ID=[id@group.calendar.google.com]
```

> `SUPABASE_SERVICE_ROLE_KEY` é usada apenas nas rotas de API (`/api/ec/propostas/pdf`, `/api/ec/propostas/excel`). Nunca exponha como variável `NEXT_PUBLIC_*`.

> `GOOGLE_CALENDAR_PRIVATE_KEY`: cole a chave PEM exatamente como retornada pelo Google (sem aspas extras ao redor). O sistema já trata os `\n` literais.

### 3.2 Build de produção

```bash
npm ci                     # instalar dependências exatas do lockfile
npm run build              # Next.js build de produção
```

O build deve concluir sem erros. Se houver erros de TypeScript, não faça deploy.

### 3.3 Deploy

**Vercel (recomendado):**
```bash
# Usando Vercel CLI
vercel --prod
```

Ou via push para main com deploy automático configurado.

### 3.4 Cache / ISR

As páginas do módulo EC usam `export const dynamic = "force-dynamic"` — sem cache estático. Não é necessário invalidar cache CDN após o deploy.

---

## 4. Pós-Deploy

### 4.1 Health Check

Acesse `/admin/health` com conta de admin.

Todos os itens devem aparecer como ✓. Qualquer ✗ indica problema estrutural no banco.

### 4.2 Checklist funcional

- [ ] Login funciona
- [ ] Sidebar carrega com permissões corretas para o usuário
- [ ] Módulo EC: criar proposta, preencher dados, calcular
- [ ] Módulo EC: gerar PDF Executivo e abrir no browser
- [ ] Módulo EC: gerar PDF Técnico e verificar BOM
- [ ] Módulo EC: exportar Excel
- [ ] Pipeline: criar lead, mover no kanban
- [ ] TV: painel carrega sem erros

### 4.3 Checklist técnico

- [ ] Não há erros 500 nos logs do hosting
- [ ] Supabase → Logs → API: sem erros repetidos
- [ ] Supabase → Auth → Users: usuários existentes estão ativos

---

## 5. Restaurar Backup

Se for necessário reverter completamente o deploy:

### 5.1 Via Supabase Point-in-Time Recovery (PITR)

1. Supabase → Settings → Database → Backups
2. Selecionar o ponto de restauração (timestamp pré-deploy)
3. Clicar em **Restore**
4. Aguardar o processo (pode levar 10–30 minutos)

### 5.2 Via dump SQL

```bash
# Restaurar o dump capturado antes do deploy
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  < backup_pre_v1.0.0_[TIMESTAMP].sql
```

> Atenção: a restauração via dump apaga e recria os dados. Todos os registros criados após o backup serão perdidos.

### 5.3 Reverter o código

```bash
# No Vercel: acessar Deployments e promover o deploy anterior
# Via CLI:
git checkout 03ba36a     # commit anterior ao RC2
vercel --prod
```

---

## 6. Contatos de Emergência

| Situação | Ação |
|----------|------|
| Banco inacessível | Verificar status em status.supabase.com |
| Deploy falhou | Promover deploy anterior no painel Vercel |
| Dados corrompidos | Restaurar backup pré-deploy imediatamente |
