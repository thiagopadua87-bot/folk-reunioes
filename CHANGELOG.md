# Changelog

## [1.0.0] — 2026-07-24

### Novidades

#### Engenharia Comercial (novo módulo)
- Motor de composição: derivação automática de soluções, kits e BOM a partir de necessidades e premissas do condomínio
- Motor de precificação: cálculo de custo mensal, margem, valor de implantação e receita com parâmetros financeiros configuráveis
- Catálogo de produtos: fabricantes, itens, fornecedores, kits e regras de composição
- Propostas com versionamento: histórico de versões, aprovação de margem, fluxo de revisão
- Dashboard Executivo: KPIs (payback, ROI, custo mensal, receita, lucro, margem) com dados da view `ec_visao_executiva`
- PDF Executivo: documento comercial voltado ao cliente (capa, dados do condomínio, solução, valores)
- PDF Técnico: documento interno completo (BOM, memorial de engenharia, precificação detalhada)
- Exportação Excel: planilha estruturada com todas as abas da proposta
- RLS com ownership por proposta: apenas o criador (ou admin) pode modificar seus registros
- 22 tabelas, 2 views, 5 funções, 45+ políticas RLS

#### Pipeline Comercial
- Kanban com drag-and-drop (DnD) entre colunas de status
- Busca automática de CNPJ
- Vínculo de Síndicos/Gestores à oportunidade
- Lixeira de leads com restauração (apenas admin)
- Concorrentes: multi-select e vencedor em Clientes Perdidos
- Separação de status "Fechado (ganho)" e "Declinado"
- Confirmação de exclusão com modal

#### Dashboard Comercial 2.0
- Indicadores preditivos: taxa de conversão, ticket médio, leads por temperatura
- Meta anual com progresso visual
- Filtro por vendedor
- Painel de resumo integrado ao Pipeline

#### Dashboard CRM
- Visão consolidada por cliente com histórico de interações

#### Módulo de Comissões
- Cálculo e recálculo por venda
- Modal Alterar Status com campos contextuais
- Histórico de competências
- Relatório com filtro por período e exportação CSV

#### Módulo de Obras 2.0
- Dashboard de obras com inteligência operacional
- Acompanhamento estruturado com ações e histórico
- Progressão de andamento de 0 a 100 (passos de 10)
- Autor salvo nos logs de obra

#### Módulo de Indicadores
- Vínculo de FK em vendas e comissões ao indicador responsável

#### Módulo de Cobrança
- CRM de cobrança por cliente com histórico de faturas

#### Módulo de Reuniões v2
- Redesign completo da interface
- Ajustes de schema

#### Admin / Plataforma
- ERP 2.0: tela de usuários com perfis, inativação e drawer de edição
- Sistema granular de permissões por tela (screen_permissions)
- Sidebar lateral com grupos colapsáveis e setor Operacional
- Perfis de sistema configuráveis
- Módulo de relatórios gerenciais com exportação Excel

#### Integração Google Calendar
- Criação de eventos via service account (sem OAuth do usuário)
- Sincronização de data de assembleia no Pipeline

---

### Correções

- **Auth:** corrigido travamento global após inatividade por contention de Navigator Lock
- **Auth:** garantido redirect de logout com timeout de 1.5 s no signOut
- **Auth:** logout via `window.location` para reset completo de estado React
- **TV:** excluído valor de implantação da meta anual de portaria remota
- **Indicadores:** alinhados valores de tipo com CHECK constraint do banco
- **Pipeline:** botão Salvar liberado imediatamente após persistência, sem aguardar reload
- **Pipeline:** revertido status e `data_assembleia` ao trocar tipo de ação de Assembleia
- **Comissões:** migration tornada idempotente com `DROP POLICY IF EXISTS`
- **Comissões:** geração correta de competências recentes quando tabela vazia
- **Cobrança:** KPIs e botões de status corrigidos na tela de clientes
- **Dashboard:** corrigido overflow de cards KPI com comparativos
- **Calendar:** normalização de private key (aspas e `\n` literais)
- **Calendar:** removido campo `attendees` (service account sem Domain-Wide Delegation)
- **Operacional:** restrição de exclusão ao admin; edição aberta para todos aprovados
- **EC (RC1):** autenticação das rotas de API PDF e Excel corrigida para servidor
- **EC (RC2):** coluna `necessita_recalculo` adicionada em `ec_versoes`
- **EC (RC2):** "Custo mensal" no Dashboard Executivo corrigido (double-count eliminado)
- **EC (RC2):** payback no PDF e na Precificação usando divisor correto (lucro, não receita)

---

### Segurança

- RLS granular em todas as tabelas EC: SELECT/INSERT/UPDATE/DELETE com ownership por proposta
- Patch de segurança RLS: eliminada política `FOR ALL USING(true)` que expunha DELETE sem verificação
- `rls_security_patch.sql` idempotente: dropa `*_escreve_autenticados` e `*_escreve_owner` antes de recriar
- `ec_versoes`: INSERT exige ser dono da proposta (não apenas autenticado)
- `ec_historico_versoes`: INSERT exige ownership da versão
- Sistema de permissões por tela com validação server-side
- Funções SECURITY DEFINER isoladas: `ec_parametros_json`, `ec_log_versao_status`
- RLS de cadastros e operacional corrigida para visibilidade de equipe

---

### Performance

- Lazy-load por sub-aba em Comissões (reduz queries na carga inicial)
- Indexes de performance EC: `proposta_id`, `versao_id`, `necessita_recalculo` (partial index)
- Indexes de inadimplência

---

### UX

- CNPJ com busca automática (Pipeline, Gestão de Crise, Clientes Perdidos)
- Sidebar com grupos colapsáveis
- Filtro por trimestre clicável em Clientes Perdidos
- Modal de confirmação de exclusão no Pipeline
- RecalcularBanner: alerta visual quando escopo foi alterado após o último cálculo EC
- Centralização de utilitário de payback: `lib/engenharia-comercial/kpi-utils.ts`
