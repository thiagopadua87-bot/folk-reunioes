# CONTEXTO_PROJETO — Folk Reuniões

> Documento gerado em 26/04/2026. Use como ponto de partida; verifique código-fonte para detalhes mutáveis.

---

## 1. Visão Geral

**Nome:** Folk Reuniões  
**Descrição:** Sistema interno de gestão para reuniões semanais e operações comerciais/projetos de uma empresa de segurança eletrônica (portaria remota, CFTV, alarme, controle de acesso).  
**Problema que resolve:** Centraliza a condução da reunião semanal da equipe, o registro de vendas/pipeline, acompanhamento de obras, gestão de clientes perdidos e cadastros de colaboradores — tudo num único sistema com histórico persistido.

### Stack Técnica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | ^16.2.4 |
| Linguagem | TypeScript | ^5 |
| UI/Estilo | Tailwind CSS v4 | ^4 |
| Backend/DB | Supabase (PostgreSQL + RLS + Storage) | @supabase/supabase-js ^2.104.0 |
| Auth | Supabase Auth (email/senha) | @supabase/ssr ^0.10.2 |
| Email | Resend | (integrado via lib/email.ts) |
| React | 19.2.4 | — |
| Componentes UI | Customizados (sem shadcn/headless) | — |

> **Sem** react-query, zustand, prisma, drizzle ou qualquer lib de charts declarada — gráficos/dashboards são construídos com HTML/Tailwind puro.

### Backend / Banco

- **Supabase** hospeda o banco PostgreSQL, Auth, Storage (buckets `vendas-anexos` e `cartas-cancelamento`) e RLS policies.
- O frontend conversa diretamente com o Supabase via SDK (`lib/supabase.ts` no browser, `lib/supabase-server.ts` em Server Components).
- Operações administrativas usam `lib/supabase-admin.ts` (service role key, apenas no servidor).
- Server Actions (Next.js) são usadas para: envio de emails, aprovação de usuários, geração de link de confirmação.

### Deploy e Variáveis de Ambiente

- **Deploy:** Vercel (`folk-reunioes.vercel.app`)
- **Variáveis necessárias:**

```
NEXT_PUBLIC_SUPABASE_URL         # URL do projeto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY    # Chave pública anon
SUPABASE_SERVICE_ROLE_KEY        # Chave secreta (somente servidor)
RESEND_API_KEY                   # Chave da API Resend (emails)
```

---

## 2. Estrutura de Pastas

```
folk-reunioes/
├── app/                    # Next.js App Router — páginas e componentes
│   ├── admin/              # Painel de aprovação de usuários (role=admin)
│   ├── auth/callback/      # Route handler OAuth callback
│   ├── cadastros/          # Vendedores, Técnicos, Terceirizados
│   ├── comercial/          # Vendas + Pipeline
│   │   ├── dashboard/      # Métricas comerciais
│   │   └── tv/             # Modo TV (apresentação sem header)
│   ├── components/         # Componentes reutilizáveis
│   ├── historico/          # Reuniões anteriores
│   ├── login/              # Tela de login
│   ├── operacional/        # Clientes perdidos + Gestão de Crise
│   ├── pendente/           # Aguardando aprovação de cadastro
│   ├── preparacao/         # // [VERIFICAR] uso atual
│   ├── projetos/           # Projetos + Obras
│   │   └── dashboard/      # Métricas de projetos
│   ├── recusado/           # Cadastro recusado
│   ├── reuniao/            # Editor de reunião
│   ├── globals.css         # Design tokens e utilitários Tailwind
│   ├── layout.tsx          # Layout raiz (fonte Inter, metadata)
│   └── page.tsx            # Página inicial — editor de reunião semanal
├── lib/                    # Lógica de negócio e acesso a dados
├── public/
│   └── sounds/             # Áudio para notificação de nova venda (TV)
├── supabase/
│   ├── migrations/         # SQL incrementais de migração
│   └── schema.sql          # Schema base completo
├── next.config.ts
├── tailwind.config.*       # Tailwind v4 (via PostCSS)
└── tsconfig.json
```

---

## 3. Páginas / Rotas

| Rota | Arquivo | Propósito | Autenticação |
|------|---------|-----------|--------------|
| `/` | `app/page.tsx` | Editor da reunião semanal com 5 blocos | Sim — aprovado |
| `/login` | `app/login/page.tsx` | Login com email e senha | Não |
| `/signup` | `app/signup/page.tsx` | Criação de conta (aguarda aprovação) | Não |
| `/pendente` | `app/pendente/page.tsx` | Tela informativa: conta aguardando aprovação | Parcial |
| `/recusado` | `app/recusado/page.tsx` | Tela informativa: conta recusada | Parcial |
| `/admin` | `app/admin/page.tsx` | Gerenciar usuários (aprovar/recusar/resetar senha) | Sim — role=admin |
| `/cadastros` | `app/cadastros/page.tsx` | 3 abas: Vendedores / Técnicos / Terceirizados | Sim — aprovado |
| `/comercial` | `app/comercial/page.tsx` | 2 abas: Vendas / Pipeline | Sim — aprovado |
| `/comercial/dashboard` | `app/comercial/dashboard/page.tsx` | Métricas comerciais (gráficos, metas) | Sim — aprovado |
| `/comercial/tv` | `app/comercial/tv/page.tsx` | Painel TV — sem header, polling 10s, som de nova venda | Sim — aprovado |
| `/projetos` | `app/projetos/page.tsx` | 2 abas: Projetos / Obras | Sim — aprovado |
| `/projetos/dashboard` | `app/projetos/dashboard/page.tsx` | Métricas de projetos e obras | Sim — aprovado |
| `/operacional` | `app/operacional/page.tsx` | 2 abas: Clientes Perdidos / Gestão de Crise | Sim — aprovado |
| `/reuniao` | `app/reuniao/page.tsx` | Editor de reunião (use client) | Sim — aprovado |
| `/historico` | `app/historico/page.tsx` | Listagem de reuniões anteriores salvas | Sim — aprovado |
| `/auth/callback` | `app/auth/callback/route.ts` | Handler OAuth (Supabase callback) | — |

> **Middleware:** // [VERIFICAR] se existe `middleware.ts` para proteger rotas ou se a verificação de auth é feita dentro de cada page.

---

## 4. Modelo de Dados

### 4.1 Profiles (`lib/profiles.ts`)

```typescript
type UserStatus = "pendente" | "aprovado" | "recusado";
type UserRole   = "user" | "admin";

interface Profile {
  id: string;           // UUID — FK para auth.users
  nome: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}
```

**Trigger:** `handle_new_user()` cria registro em `profiles` automaticamente ao signup, com `status = "pendente"`.

---

### 4.2 Venda (`lib/comercial.ts`)

```typescript
interface Venda {
  id: string;
  user_id: string;
  data_fechamento: string;           // ISO date "YYYY-MM-DD"
  vendedor_id: string | null;        // FK → vendedores
  vendedor_nome: string | null;      // desnormalizado
  cnpj: string;
  cliente: string;
  valor_implantacao: number;         // R$ — implantação única
  valor_mensal: number;              // R$ — receita recorrente
  indicado_por: string;
  observacoes: string;
  servicos: string[];                // array de SERVICOS_COMERCIAL
  tipo_venda: "recorrente" | "venda_direta";
  arquivo_url: string | null;        // Supabase Storage bucket "vendas-anexos"
  arquivo_nome: string | null;
  enviado_para_projetos: boolean;
  pipeline_id: string | null;        // FK → pipeline (se veio de lá)
  created_at: string;
}
```

**Tabela relacional:** `venda_servicos` (join N:N entre `vendas` e serviços).  
**Audit:** tabela `vendas_logs` (campo, valor_anterior, valor_novo, autor_nome).

---

### 4.3 PipelineItem (`lib/comercial.ts`)

```typescript
interface PipelineItem {
  id: string;
  user_id: string;
  data_inicio_lead: string;
  vendedor_id: string | null;
  vendedor_nome: string | null;
  cliente: string;
  temperatura: "fria" | "morna" | "quente";
  valor_implantacao: number;
  valor_mensal: number;
  status: "apresentacao" | "em_analise" | "assinatura" | "fechado" | "declinado" | "fechado_ganho";
  indicado_por: string;
  observacoes: string;
  servicos: string[];
  convertido_em_venda: boolean;
  venda_id: string | null;           // FK → vendas (pós-conversão)
  created_at: string;
}
```

**Audit:** tabela `pipeline_logs`.

---

### 4.4 Projeto (`lib/projetos.ts`)

```typescript
type TipoProjeto   = "portaria_remota" | "grandes_projetos" | "seguranca_eletronica";
type SituacaoProjeto = "em_execucao" | "entregue_ao_comercial";

interface Projeto {
  id: string;
  user_id: string;
  data_inicio: string;
  cliente: string;
  servicos: string[];
  situacao: SituacaoProjeto;
  valor: number;
  observacoes: string;
  created_at: string;
}
```

---

### 4.5 Obra (`lib/projetos.ts`)

```typescript
type SituacaoObra = "a_executar" | "em_execucao" | "paralizada" | "finalizada";
type Equipe       = "equipe_propria" | "terceiro";
type Andamento    = 0 | 20 | 40 | 60 | 80 | 100;

interface Obra {
  id: string;
  user_id: string;
  data_inicio: string;
  data_inicio_previsto: string | null;
  data_prazo: string | null;
  data_conclusao: string | null;
  cliente: string;
  servicos: string[];
  situacao: SituacaoObra;
  equipe: Equipe;
  tecnico_id: string | null;          // FK → tecnicos
  tecnico_nome: string | null;
  terceirizado_id: string | null;     // FK → terceirizados
  terceirizado_nome: string | null;
  valor_execucao: number;
  andamento: Andamento;               // percentual em steps de 20
  observacoes: string;
  venda_id: string | null;            // FK → vendas (origem)
  created_at: string;
}
```

**Audit:** tabela `projetos_obra_logs`.

---

### 4.6 Cadastros (`lib/cadastros.ts`)

```typescript
interface Vendedor {
  id: string; user_id: string; nome: string;
  telefone: string; email: string; ativo: boolean; created_at: string;
}

interface Tecnico {
  id: string; user_id: string; nome: string;
  telefone: string; email: string; ativo: boolean; created_at: string;
}

interface Terceirizado {
  id: string; user_id: string; cnpj: string; nome_empresa: string;
  contato: string; telefone: string; email: string;
  nome_responsavel: string; cpf_responsavel: string;
  ativo: boolean; created_at: string;
}
```

---

### 4.7 Operacional (`lib/operacional.ts`)

```typescript
type TipoServico = "portaria_remota" | "monitoramento" | "monitoramento_manutencao"
                 | "monitoramento_locacao" | "locacao_equipamentos";
type MotivoPerda = "qualidade_servico" | "preco" | "relacionamento" | "faturamento" | "outros";
type NivelRisco  = "baixo" | "medio" | "alto" | "revertido";
//                                               ↑ adicionado; sort: alto→medio→baixo→revertido

interface ClientePerdido {
  id: string; user_id: string;
  crise_id: string | null;          // FK → gestao_crise (null se cadastro direto)
  data_aviso: string; data_encerramento: string;
  cliente: string; tipo_servico: TipoServico;
  valor_contrato: number; motivo_perda: MotivoPerda;
  observacoes: string; created_at: string;
}

interface CriseItem {
  id: string; user_id: string;
  cliente: string; tipo_servico: TipoServico;
  risco: NivelRisco; acoes: string;
  // Carta de cancelamento
  apresentou_carta_cancelamento: boolean;   // default false
  data_aviso: string | null;               // data em que o cliente entregou a carta
  prazo_aviso_dias: number | null;          // dias de aviso contratuais
  carta_url: string | null;                // Storage bucket "cartas-cancelamento"
  carta_nome: string | null;
  // Promoção a Cliente Perdido
  promovido_para_perdido: boolean;          // default false
  cliente_perdido_id: string | null;        // FK → clientes_perdidos ON DELETE RESTRICT
  created_at: string;
}

// Payload aceito pelo formulário de edição (exclui campos de promoção)
type CriseEditPayload = {
  cliente: string; tipo_servico: TipoServico; risco: NivelRisco; acoes: string;
  apresentou_carta_cancelamento: boolean;
  data_aviso: string | null; prazo_aviso_dias: number | null;
};

// Evento formatado para exibição no modal de histórico
interface EventoHistorico {
  id: string; icone: string; titulo: string; descricao: string;
  autor_nome: string | null; created_at: string;
  fonte: "crise" | "cliente_perdido";
}
```

**Helpers de data:**

| Função | Descrição |
|--------|-----------|
| `calcularEncerramentoBR(dataAviso, prazoDias)` | Retorna `dd/mm/aaaa` da data de encerramento projetada |
| `calcularEncerramentoISO(dataAviso, prazoDias)` | Retorna `YYYY-MM-DD` da data projetada |
| `diasParaEncerramento(dataAviso, prazoDias)` | Dias restantes até encerramento (negativo = vencido) |

**Formatação de eventos (sem tabela extra):**

| Função | Descrição |
|--------|-----------|
| `formatarEventoCrise(log: CriseLog)` | Recebe linha de `crise_logs` → retorna `EventoHistorico` com ícone e descrição humana |
| `formatarEventoClientePerdido(log: ClientePerdidoLog)` | Idem para `clientes_perdidos_logs` |
| `listarHistoricoUnificado(criseId, clientePerdidoId)` | Faz UNION em memória de `crise_logs` + `clientes_perdidos_logs`, ordenado por `created_at DESC` |

**Eventos reconhecidos em `crise_logs` (campo `campo`):**

| `campo` | Evento interpretado |
|---------|-------------------|
| `crise_criada` | Crise registrada |
| `risco` → valor_novo="Revertido" | Crise revertida |
| `risco` (outros) | Risco alterado |
| `apresentou_carta_cancelamento` | Carta registrada ou removida |
| `data_aviso`, `prazo_aviso_dias` | Datas da carta atualizadas |
| `carta_arquivo` | PDF da carta anexado |
| `promovido_para_perdido` | Promovido a Cliente Perdido |
| `acoes` | Ações atualizadas |

**Funções CRUD adicionadas:**

| Função | Descrição |
|--------|-----------|
| `criarCrise(payload)` | Retorna `string` (id) e loga evento `crise_criada` |
| `uploadCartaArquivo(criseId, file)` | Upload para bucket `cartas-cancelamento`, atualiza `carta_url`/`carta_nome`, loga |
| `removerCartaArquivo(criseId, cartaNome)` | Limpa `carta_url`/`carta_nome`, loga |
| `promoverCriseParaPerdido(crise, payload)` | Cria `ClientePerdido` com `crise_id`, atualiza `gestao_crise`, loga nas duas tabelas. Retorna o id do novo registro |

**Audit:** `crise_logs` (campo, valor_anterior, valor_novo, autor_nome) e `clientes_perdidos_logs` (mesma estrutura, campo `registro_id`). Sem `operacional_logs` — as duas tabelas de log são a única fonte de verdade para o histórico.

---

### 4.8 Reunião (`lib/reunioes.ts`, `lib/blocos.ts`)

```typescript
interface Reuniao {
  id: string; user_id: string; data: string;
  responsavel: string; participantes: string;
  blocos: Bloco[];        // JSONB no banco
  progresso: number;      // 0–100
  resumo: string;
  created_at: string;
}
```

**Blocos pré-definidos** (estrutura de checklist):

| Bloco | Itens |
|-------|-------|
| Abertura | Responsável, participantes, pauta |
| Comercial | Dados de vendas, pipeline |
| Operação | Chamados, SLA, pendências |
| Projetos | Status de obras e projetos |
| Ações | Lista de tarefas/responsáveis |

Cada item pode ser do tipo `texto` (textarea) ou `tabela` (TabelaChecklist com colunas tipadas).

---

### 4.9 Relações Entre Entidades

```
auth.users
  └── profiles (1:1, trigger on insert)

profiles (user_id)
  ├── reunioes
  ├── vendas
  │     └── venda_servicos (N:N serviços)
  │     └── vendas_logs (audit)
  ├── pipeline
  │     └── pipeline_logs (audit)
  ├── projetos
  ├── obras
  │     └── projetos_obra_logs (audit)
  ├── vendedores
  ├── tecnicos
  ├── terceirizados
  ├── clientes_perdidos
  │     └── clientes_perdidos_logs (audit)
  └── gestao_crise
        └── crise_logs (audit)

clientes_perdidos ──(crise_id)──────► gestao_crise  (ON DELETE SET NULL)
gestao_crise      ──(cliente_perdido_id)► clientes_perdidos  (ON DELETE RESTRICT)

vendas ──(pipeline_id)──► pipeline
obras  ──(venda_id)──────► vendas
obras  ──(tecnico_id)────► tecnicos
obras  ──(terceirizado_id)► terceirizados
vendas ──(vendedor_id)───► vendedores
pipeline─(vendedor_id)───► vendedores
```

> **Modelo user_id:** Todos os dados pertencem a um `user_id`. Não há conceito de "empresa" — o tenant é o usuário aprovado.

---

## 5. Sistema de Design

### Paleta de Cores

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-folk` | `#F05A28` | Cor primária (laranja Folk) |
| `--color-folk-light` | `#FF7A3C` | Hover, gradiente |
| `--color-folk-dark` | `#D44A1A` | Active/pressed |
| `--background` | `#F5F5F5` | Fundo da página |
| `--foreground` | `#1F2937` | Texto principal |

**Gradientes customizados (Tailwind @utility):**
- `bg-folk-gradient` → `linear-gradient(90deg, #F05A28, #FF7A3C)` (botões primários, header)
- `bg-folk-header` → `linear-gradient(90deg, #fff5f2, #ffffff)` (fundo do AppHeader)

**Cores semânticas usadas inline:**
- Temperatura Fria → `text-blue-600`
- Temperatura Morna → `text-amber-600`
- Temperatura Quente → `text-red-600`
- Nível de Risco Alto → vermelho; Médio → amarelo; Baixo → verde

### Tipografia

- **Família:** Inter (Google Fonts), carregada via Next.js `next/font`
- **CSS Var:** `--font-sans: var(--font-inter)`
- Escala: padrão Tailwind (sm/base/lg/xl/2xl/3xl)

### Biblioteca de Componentes

Sem shadcn/ui ou biblioteca externa. Componentes são customizados com Tailwind v4:

| Arquivo | Componentes exportados |
|---------|----------------------|
| `app/components/ui.tsx` | `Card`, `CardHeader`, `Alert` |
| `app/components/AppHeader.tsx` | `AppHeader` — header sticky com nav e logout |
| `app/components/LogoFolk.tsx` | `LogoFolk` — logo SVG da marca |
| `app/components/LogoutButton.tsx` | `LogoutButton` |
| `app/components/IdentificacaoForm.tsx` | `IdentificacaoForm` — responsável + participantes |
| `app/components/MeetingBlock.tsx` | `MeetingBlock` — bloco de reunião |
| `app/components/TabelaChecklist.tsx` | `TabelaChecklist` — tabela editável inline |
| `app/components/FinalizarButton.tsx` | `FinalizarButton` — salva reunião |
| `app/components/ResumoCard.tsx` | `ResumoCard` — preview do resumo |
| `app/components/ReuniaoCard.tsx` | `ReuniaoCard` — card de reunião no histórico |

### Tema

- Apenas **tema claro**. Sem dark mode implementado.
- Fundo cinza claro (`#F5F5F5`), texto escuro (`#1F2937`), destaques em laranja Folk.

### Padrões Visuais

- **Cards:** `rounded-xl shadow-sm bg-white p-4/6` — padrão em todo o sistema
- **Badges de status:** `rounded-full px-2 py-0.5 text-xs font-medium` com cores por estado
- **Tabelas:** `table-auto w-full text-sm` com `thead` cinza e linhas com `hover:bg-gray-50`
- **Botão primário:** `bg-folk-gradient text-white rounded-lg px-4 py-2`
- **Abas:** botões com `border-b-2 border-folk` quando ativas

---

## 6. Funcionalidades Principais

### 6.1 Reunião Semanal (`/` e `/reuniao`)

- Editor com 5 blocos configuráveis (Abertura, Comercial, Operação, Projetos, Ações)
- Cada bloco contém itens do tipo **texto** (anotação livre) ou **tabela** (linhas editáveis com colunas tipadas)
- Tipos de coluna da tabela: `text`, `date`, `moeda` (prefixo R$), `select` (dropdown)
- Guard de mudanças não salvas via Context (`lib/unsaved-changes.tsx`) — bloqueia saída acidental
- Gera resumo textual formatado em PT-BR (`lib/resumo.ts`)
- Salva como reunião histórica no Supabase

### 6.2 Histórico (`/historico`)

- Lista todas as reuniões salvas do usuário (`force-dynamic`)
- Exibe card com data, responsável, participantes e resumo
- Componente: `ReuniaoCard`

### 6.3 Comercial — Vendas (`/comercial`, aba Vendas)

- CRUD completo de vendas com paginação (10 por página)
- Filtros: data início/fim, tipo de venda
- Campos: data de fechamento, vendedor, CNPJ, cliente, valor implantação, valor mensal, serviços (multi-select), tipo de venda, indicado por, observações, anexo (PDF/imagem)
- Upload de anexo para Supabase Storage (`vendas-anexos`)
- Ação "Enviar para Projetos" — cria obra vinculada à venda
- Tabela compacta (7 colunas visíveis), overflow horizontal

### 6.4 Comercial — Pipeline (`/comercial`, aba Pipeline)

- CRUD de propostas em negociação
- Status sequencial: `apresentacao` → `em_analise` → `assinatura` → `fechado_ganho` | `declinado`
- Temperatura visual: Fria (azul) / Morna (âmbar) / Quente (vermelho)
- Ação "Converter em Venda" — cria venda pré-preenchida e marca `convertido_em_venda = true`
- Audit log completo de mudanças de campo

### 6.5 Comercial — Dashboard (`/comercial/dashboard`)

- Métricas do período (selecionável): total de vendas, receita recorrente, ticket médio
- Ranking de vendedores por valor mensal
- Gráfico de evolução mensal
- Resumo de pipeline por status

### 6.6 Comercial — Modo TV (`/comercial/tv`)

- Tela para projetor/TV sem header de navegação
- **Polling automático a cada 10 segundos** (sem Realtime/WebSocket)
- Exibe: meta anual (Bronze R$33k / Prata R$44k / Ouro R$55k por mês), receita acumulada no ano, ranking de vendedores, pipeline ativo, card de equipamentos/serviços
- Som de notificação ao detectar nova venda (requer clique inicial para ativar áudio no browser)
- Relógio em tempo real (`useState` com `setInterval`)
- Metas configuradas como constantes no topo do arquivo: `META_BRONZE = 33_000`, `META_PRATA = 44_000`, `META_OURO = 55_000`

### 6.7 Projetos (`/projetos`)

- **Aba Projetos:** CRUD de projetos de engenharia (Portaria Remota, Grandes Projetos, Segurança Eletrônica)
- **Aba Obras:** CRUD de execução de obras com andamento (0/20/40/60/80/100%), equipe própria ou terceirizada, técnico/terceirizado responsável, datas previstas e reais

### 6.8 Projetos — Dashboard (`/projetos/dashboard`)

- Métricas de obras por situação, andamento médio, valor total em execução

### 6.9 Operacional (`/operacional`)

As duas abas são integradas: o fluxo real é **crise → carta de cancelamento → promoção a Cliente Perdido (ou reversão)**. O estado elevado em `page.tsx` gerencia a navegação cross-tab.

**Aba Gestão de Crise** (`GestaoCrise.tsx`):

- **Níveis de risco:** Baixo / Médio / Alto / **Revertido** (novo) — ordenados por urgência; revertidos ficam por último
- **Carta de cancelamento (por item):**
  - Checkbox "Cliente apresentou carta de cancelamento?"
  - Ao marcar: inputs "Data do aviso" e "Prazo de aviso (dias)" + cálculo ao vivo de "Encerramento previsto: dd/mm/aaaa"
  - Ao desmarcar: campos limpos automaticamente
  - Upload de PDF da carta (bucket `cartas-cancelamento`) — independente do checkbox
- **Badge de urgência da carta** em cada card da listagem:
  - "Sem carta" (cinza) / "Com carta" (azul, sem datas) / "Encerra em Xd" com cores: verde >30d, amarelo 8–30d, vermelho ≤7d, cinza-escuro se vencido
- **Promoção a Cliente Perdido:**
  - Botão "Promover" abre modal pré-preenchido (cliente, tipo, datas da carta, acoes como observações)
  - Ao confirmar: cria `ClientePerdido` com `crise_id`, marca crise como `promovido_para_perdido = true`, navega para a aba CP e destaca o novo registro (ring de 2s)
  - Item promovido: badge cinza "Promovido a Cliente Perdido", `opacity-60`, risco e ações desabilitados, botão "Promover" desabilitado, link "Ver na aba Clientes Perdidos →"
- **Status Revertido:** badge verde, `opacity-75`, botão "Promover" desabilitado; campos de carta preservados como histórico
- **Modal de histórico** (botão "Histórico" por item): timeline de eventos lidos de `crise_logs` e formatados via `formatarEventoCrise`

**Aba Clientes Perdidos** (`ClientesPerdidos.tsx`):

- CRUD original preservado: data de aviso, encerramento, cliente, tipo de serviço, valor, motivo, observações
- **Badge "Vindo da Gestão de Crise ↗"** (âmbar, clicável) abaixo do nome do cliente para registros com `crise_id ≠ null`
- **Botão "Histórico"** em todos os registros; para registros com `crise_id` o modal exibe timeline **unificada** (`crise_logs` + `clientes_perdidos_logs`) com chip âmbar "crise" nos eventos de origem
- **Foco cross-tab:** ao navegar via "Ver na aba Clientes Perdidos →", o registro recebe scroll-into-view + ring âmbar de 2s; estado gerenciado via `focoRegistroId` em `page.tsx`
- Formulário de edição: preserva `crise_id` existente (não zera ao salvar); histórico inline migrado para ícones via `formatarEventoClientePerdido`

**Navegação cross-tab** (`page.tsx`):
- `focoRegistroId: string | null` — elevado para `page.tsx`
- `navegarParaClientePerdido(id)` — troca aba + define `focoRegistroId`
- `onFocoConsumido()` — limpa `focoRegistroId` após o highlight de 2s

### 6.10 Cadastros (`/cadastros`)

- **Vendedores:** Nome, telefone, email, ativo/inativo
- **Técnicos:** Mesmos campos de Vendedor
- **Terceirizados:** CNPJ, empresa, contato, telefone, email, responsável, CPF, ativo/inativo
- Filtros de busca por nome e toggle ativo/inativo em todas as abas

### 6.11 Admin (`/admin`)

- Lista todos os perfis com status (pendente/aprovado/recusado), role e data de criação
- Ações por usuário: **Aprovar** (status → aprovado + envia email), **Recusar** (status → recusado), **Gerar link de confirmação**, **Resetar senha**
- Apenas usuários com `role = "admin"` têm acesso (verificação no servidor)
- Usa `supabase-admin.ts` (service role key) para operações privilegiadas

---

## 7. Convenções do Projeto

### Nomenclatura

- **Páginas:** `page.tsx` dentro da pasta da rota
- **Componentes:** PascalCase (`AppHeader`, `TabelaChecklist`)
- **Libs/utils:** kebab-case no arquivo (`dados-comerciais.ts`), camelCase nos exports (`listarVendas`)
- **Types/Interfaces:** PascalCase (`Venda`, `PipelineItem`, `StatusPipeline`)
- **Constantes enum:** SCREAMING_SNAKE_CASE (`TIPOS_VENDA`, `STATUS_PIPELINE`)

### Fetching de Dados

- **Server Components:** `await supabaseServer().from(...)` via `lib/supabase-server.ts`
- **Client Components:** Funções de `lib/comercial.ts`, `lib/projetos.ts`, etc. (chamadas diretas ao Supabase SDK no browser)
- **Server Actions:** `"use server"` para admin, signup, email
- **Sem** react-query ou SWR — estado local com `useState` + `useEffect`

### Estado

- Estado local por componente (`useState`)
- **Context API** apenas para: `UnsavedChangesContext` (`lib/unsaved-changes.tsx`)
- Sem Zustand, Jotai ou Redux

### Formatação PT-BR

```typescript
// Moeda
new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
// → "R$ 1.234,56"

// Função helper em lib/comercial.ts
formatMoeda(v: number): string

// Data
new Date(s + "T00:00:00").toLocaleDateString("pt-BR")
// → "26/04/2026"

// Função helper em lib/comercial.ts
formatData(s: string): string
```

> **Atenção:** Datas são strings `"YYYY-MM-DD"` no banco. Para evitar offset de fuso horário, sempre concatenar `"T00:00:00"` antes de parsear com `new Date()`.

### Padrão de Servidor

- `"use client"` apenas quando necessário (interatividade, hooks de browser)
- `"use server"` para server actions
- `export const dynamic = "force-dynamic"` em páginas que precisam de auth atualizada a cada request (admin, histórico)

---

## 8. Serviços / Produtos da Empresa

Lista canônica em `SERVICOS_COMERCIAL` (`lib/comercial.ts`):

```typescript
["Portaria Remota", "CFTV", "Alarme", "Monitoramento de Alarme",
 "Controle de Acesso", "Retrofit", "Aditivo de contrato"]
```

Tipos de serviço no operacional (`TipoServico`):

```typescript
"portaria_remota" | "monitoramento" | "monitoramento_manutencao"
| "monitoramento_locacao" | "locacao_equipamentos"
```

---

## 9. Banco de Dados — Resumo das Tabelas

| Tabela | Descrição | Chave de acesso |
|--------|-----------|----------------|
| `profiles` | Perfis de usuário (role, status) | `id = auth.uid()` |
| `reunioes` | Reuniões salvas (blocos como JSONB) | `user_id = auth.uid()` |
| `vendas` | Vendas fechadas | `user_id = auth.uid()` |
| `venda_servicos` | N:N vendas ↔ serviços | via `venda_id` |
| `pipeline` | Propostas em negociação | `user_id = auth.uid()` |
| `projetos` | Projetos de engenharia | `user_id = auth.uid()` |
| `obras` | Execução de obras | `user_id = auth.uid()` |
| `vendedores` | Cadastro de vendedores | `user_id = auth.uid()` |
| `tecnicos` | Cadastro de técnicos | `user_id = auth.uid()` |
| `terceirizados` | Cadastro de terceirizados | `user_id = auth.uid()` |
| `clientes_perdidos` | Cancelamentos registrados (inclui `crise_id` FK) | `user_id = auth.uid()` |
| `gestao_crise` | Clientes em risco — **nome real da tabela** (não `crise_itens`) | `user_id = auth.uid()` |
| `vendas_logs` | Audit de alterações em vendas | — |
| `pipeline_logs` | Audit de alterações no pipeline | — |
| `projetos_obra_logs` | Audit de obras | — |
| `crise_logs` | Audit de `gestao_crise` (campo, valor_anterior, valor_novo, autor_nome) | via `crise_id` |
| `clientes_perdidos_logs` | Audit de `clientes_perdidos` (mesma estrutura, campo `registro_id`) | via `registro_id` |

> **Nota:** Não existe tabela `operacional_logs` nem `crise_itens` — os nomes corretos são `gestao_crise`, `crise_logs` e `clientes_perdidos_logs`.

**Colunas adicionadas em `gestao_crise` (migrations de 26/04/2026):**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `apresentou_carta_cancelamento` | `BOOLEAN DEFAULT false` | Flag de carta |
| `data_aviso` | `DATE` | Data em que o cliente entregou a carta |
| `prazo_aviso_dias` | `INTEGER` | Prazo contratual de aviso em dias |
| `carta_url` | `TEXT` | URL pública do PDF no Storage |
| `carta_nome` | `TEXT` | Nome original do arquivo |
| `promovido_para_perdido` | `BOOLEAN DEFAULT false` | Flag de promoção |
| `cliente_perdido_id` | `UUID REFERENCES clientes_perdidos(id) ON DELETE RESTRICT` | FK pós-promoção |
| `risco` CHECK | atualizado para incluir `'revertido'` | — |

**Colunas adicionadas em `clientes_perdidos`:**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `crise_id` | `UUID REFERENCES gestao_crise(id) ON DELETE SET NULL` | Origem (null se cadastro direto) |

**Storage buckets:**

| Bucket | Uso |
|--------|-----|
| `vendas-anexos` | Anexos das vendas (PDF/imagem) |
| `cartas-cancelamento` | PDFs das cartas de cancelamento de clientes em crise |

**RLS:** Todas as tabelas têm Row Level Security ativa. Políticas garantem que usuários acessam apenas seus próprios dados (`user_id = auth.uid()`). Operações admin usam service role key (contorna RLS).

**Migrations em `supabase/migrations/`:**

| Arquivo | O que faz |
|---------|-----------|
| `add_fechado_ganho_to_pipeline_status.sql` | Adicionou `"fechado_ganho"` ao status de pipeline |
| `split_valor_aproximado_pipeline.sql` | Separou `valor_aproximado` em `valor_implantacao` + `valor_mensal` |
| `split_valor_vendas.sql` | Idem para `vendas` |
| `add_carta_cancelamento_gestao_crise.sql` | Campos de carta em `gestao_crise` |
| `add_crise_id_clientes_perdidos.sql` | FK `crise_id` em `clientes_perdidos` (ON DELETE SET NULL) |
| `add_promocao_gestao_crise.sql` | Campos de promoção em `gestao_crise` (FK ON DELETE RESTRICT) |
| `add_revertido_nivel_risco.sql` | Adiciona `'revertido'` ao CHECK constraint de `risco` |
| `add_carta_arquivo_gestao_crise.sql` | Colunas `carta_url` e `carta_nome` em `gestao_crise` |

---

## 10. Fluxo de Autenticação

```
1. Usuário acessa /signup
   → Preenche nome, email, senha
   → Supabase Auth cria user
   → Trigger SQL cria profile com status="pendente"
   → Server action envia email via Resend (template emailCadastroCriado)

2. Usuário tenta /login
   → Supabase Auth valida credenciais
   → Frontend lê profile.status:
     - "pendente"  → redirect /pendente
     - "recusado"  → redirect /recusado
     - "aprovado"  → redirect /

3. Admin acessa /admin
   → Lista profiles com status="pendente"
   → Clica "Aprovar":
     - supabaseAdmin atualiza profile.status = "aprovado"
     - Server action envia email via Resend (template emailCadastroAprovado)

4. Sessão mantida via cookies (Supabase SSR)
   → lib/supabase-server.ts gerencia cookies em Server Components
```

---

## 11. Pendências Conhecidas / Débitos Técnicos

> **Nota:** Nenhum TODO/FIXME encontrado no código via grep. Itens abaixo são inferidos da estrutura.

1. **`/preparacao` — uso desconhecido:** Existe a pasta `app/preparacao/` mas seu propósito atual não está documentado. // [VERIFICAR]

2. **Polling na TV em vez de Realtime:** `app/comercial/tv/page.tsx` usa `setInterval` de 10s ao invés de Supabase Realtime (WebSockets). Funcional, mas gera N requisições desnecessárias quando não há mudanças.

3. **Sem middleware de proteção de rotas:** A verificação de autenticação/role parece ser feita dentro de cada page.tsx individualmente. Um `middleware.ts` centralizaria isso. // [VERIFICAR]

4. **Dados desnormalizados (`vendedor_nome`):** `vendas` e `pipeline` armazenam `vendedor_nome` como cópia do nome do vendedor. Se o nome for alterado no cadastro, registros históricos não refletem a mudança. Trade-off intencional para simplificar queries, mas pode causar inconsistência.

5. **Sem testes automatizados:** Nenhum arquivo de teste (`*.test.ts`, `*.spec.ts`) foi encontrado no projeto.

6. **Metas hardcoded na TV:** `META_BRONZE`, `META_PRATA`, `META_OURO` são constantes no topo de `app/comercial/tv/page.tsx`. Para mudar as metas é necessário editar o código.

7. **`dados_comerciais` / `dados_projetos` (tabelas legacy):** Existem tabelas `dados_comerciais` e `dados_projetos` com linhas em JSONB, além das tabelas estruturadas (`vendas`, `pipeline`, `projetos`, `obras`). As funções `lib/dados-comerciais.ts` e `lib/dados-projetos.ts` sugerem uma migração em andamento ou concluída. // [VERIFICAR] se essas tabelas ainda têm uso ativo.

---

## 12. Arquivos-Chave para Orientação Rápida

| Pergunta | Onde olhar |
|----------|-----------|
| Como funciona o login/aprovação? | `lib/auth.ts`, `app/login/page.tsx`, `app/admin/page.tsx` |
| Quais são os tipos de venda/pipeline? | `lib/comercial.ts` (topo do arquivo) |
| Como são os blocos da reunião? | `lib/blocos.ts` |
| Como funciona a TV? | `app/comercial/tv/page.tsx` |
| Como adicionar um novo serviço ao menu? | `SERVICOS_COMERCIAL` em `lib/comercial.ts` |
| Como o resumo da reunião é gerado? | `lib/resumo.ts` |
| Como enviar email? | `lib/email.ts` + `RESEND_API_KEY` |
| Como acessar o DB no servidor? | `lib/supabase-server.ts` |
| Como fazer operação de admin (contorna RLS)? | `lib/supabase-admin.ts` |
| Schema completo do banco? | `supabase/schema.sql` + `supabase/migrations/` |
