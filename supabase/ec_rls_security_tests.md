# Plano de Testes de Segurança — RLS Engenharia Comercial

## Contexto

Validar as políticas RLS após a execução das migrations:
1. `engenharia_comercial_rls_ownership.sql`
2. `engenharia_comercial_rls_security_patch.sql`

Todos os testes devem ser executados no **Supabase Dashboard → SQL Editor**,
alternando entre sessões simuladas com `SET LOCAL role` ou via API com JWT distintos.

---

## Cenários de usuário

| Rótulo | Definição | Como simular no SQL Editor |
|--------|-----------|---------------------------|
| **Owner** | `auth.uid() = proposta.created_by` | JWT do criador da proposta |
| **Outro** | Autenticado, não é dono, não é admin | JWT de outro usuário do sistema |
| **Admin** | `profiles.role = 'admin'` | JWT de usuário com `role = 'admin'` |
| **Anon** | Sem JWT válido | Chave anon sem autenticação |

---

## Convenções

- ✅ **PERMITIDO** — esperado que retorne dados ou `affected rows > 0`
- ❌ **NEGADO** — esperado que retorne `0 rows` ou erro RLS (código `42501`)
- Substituir `<proposta_id>`, `<versao_id>`, `<row_id>` pelos UUIDs reais de teste

---

## Pré-condições de setup

```sql
-- Criar proposta de teste pertencente ao Owner
INSERT INTO ec_propostas (id, pipeline_id, nome, created_by)
VALUES
  ('<proposta_owner>', '<pipeline_id>', 'Proposta Owner', '<uid_owner>');

-- Criar versão pertencente ao Owner
INSERT INTO ec_versoes (id, proposta_id, numero, created_by)
VALUES
  ('<versao_owner>', '<proposta_owner>', 1, '<uid_owner>');

-- Criar proposta separada para o Outro (para testar INSERT legítimo)
INSERT INTO ec_propostas (id, pipeline_id, nome, created_by)
VALUES
  ('<proposta_outro>', '<pipeline_id>', 'Proposta Outro', '<uid_outro>');

INSERT INTO ec_versoes (id, proposta_id, numero, created_by)
VALUES
  ('<versao_outro>', '<proposta_outro>', 1, '<uid_outro>');

-- Criar uma necessidade na proposta do Owner (para testes de UPDATE/DELETE)
INSERT INTO ec_necessidades (id, versao_id, categoria, item, quantidade)
VALUES
  ('<nec_owner>', '<versao_owner>', 'CFTV', 'Câmera IP', 4);
```

---

## 1. ec_propostas

### 1.1 SELECT

| Cenário | SQL | Resultado Esperado |
|---------|-----|-------------------|
| Owner | `SELECT * FROM ec_propostas WHERE id = '<proposta_owner>'` | ✅ 1 linha |
| Outro | `SELECT * FROM ec_propostas WHERE id = '<proposta_owner>'` | ✅ 1 linha (visibilidade de equipe) |
| Admin | `SELECT * FROM ec_propostas` | ✅ todas as linhas |
| Anon | `SELECT * FROM ec_propostas` | ❌ 0 linhas (política `TO authenticated`) |

### 1.2 INSERT

| Cenário | SQL | Resultado Esperado |
|---------|-----|-------------------|
| Owner | `INSERT INTO ec_propostas (pipeline_id, nome, created_by) VALUES ('<pip>', 'Nova', auth.uid())` | ✅ inserido |
| Outro | `INSERT INTO ec_propostas (pipeline_id, nome, created_by) VALUES ('<pip>', 'Nova', auth.uid())` | ✅ inserido (criando proposta própria) |
| Outro tentando forjar created_by | `INSERT INTO ec_propostas (nome, created_by) VALUES ('Forjado', '<uid_owner>')` | ❌ violação de `WITH CHECK(uid = created_by)` |
| Anon | qualquer INSERT | ❌ |

### 1.3 UPDATE

| Cenário | SQL | Resultado Esperado |
|---------|-----|-------------------|
| Owner | `UPDATE ec_propostas SET nome = 'Atualizado' WHERE id = '<proposta_owner>'` | ✅ |
| Outro tentando proposta alheia | `UPDATE ec_propostas SET nome = 'Hackeado' WHERE id = '<proposta_owner>'` | ❌ 0 rows (USING falha) |
| Admin | `UPDATE ec_propostas SET nome = 'Admin edit' WHERE id = '<proposta_owner>'` | ✅ |
| Anon | qualquer UPDATE | ❌ |

### 1.4 DELETE

| Cenário | SQL | Resultado Esperado |
|---------|-----|-------------------|
| Owner tentando excluir própria proposta | `DELETE FROM ec_propostas WHERE id = '<proposta_owner>'` | ❌ (somente admin pode excluir) |
| Outro | `DELETE FROM ec_propostas WHERE id = '<proposta_owner>'` | ❌ |
| Admin | `DELETE FROM ec_propostas WHERE id = '<proposta_owner>'` | ✅ |
| Anon | qualquer DELETE | ❌ |

---

## 2. ec_versoes

### 2.1 SELECT

| Cenário | Resultado Esperado |
|---------|-------------------|
| Owner, Outro, Admin | ✅ todas as versões visíveis |
| Anon | ❌ |

### 2.2 INSERT — foco na correção de segurança (#3 da auditoria)

| Cenário | SQL | Resultado Esperado |
|---------|-----|-------------------|
| Owner na própria proposta | `INSERT INTO ec_versoes (proposta_id, numero, created_by) VALUES ('<proposta_owner>', 2, auth.uid())` | ✅ |
| **Outro tentando criar versão em proposta alheia** | `INSERT INTO ec_versoes (proposta_id, numero, created_by) VALUES ('<proposta_owner>', 99, auth.uid())` | ❌ **WITH CHECK falha: proposta não pertence ao Outro** |
| Admin em proposta alheia | `INSERT INTO ec_versoes (proposta_id, numero, created_by) VALUES ('<proposta_owner>', 99, auth.uid())` | ✅ (admin) |
| Qualquer usuário forjando created_by | `INSERT INTO ec_versoes (proposta_id, numero, created_by) VALUES ('<proposta_owner>', 3, '<uid_owner>')` | ❌ viola `auth.uid() = created_by` |
| Anon | qualquer INSERT | ❌ |

### 2.3 UPDATE

| Cenário | Resultado Esperado |
|---------|-------------------|
| Owner atualizando própria versão | ✅ |
| Outro tentando atualizar versão alheia | ❌ USING(ownership) falha |
| Admin | ✅ |
| Anon | ❌ |

### 2.4 DELETE

| Cenário | Resultado Esperado |
|---------|-------------------|
| Owner | ❌ (somente admin) |
| Outro | ❌ |
| Admin | ✅ |
| Anon | ❌ |

---

## 3. Tabelas Filhas (ec_necessidades como exemplo canônico)

As mesmas políticas se aplicam a:
`ec_projeto_dados`, `ec_necessidades`, `ec_premissas`,
`ec_versao_solucoes`, `ec_custos_proposta`, `ec_lista_materiais`, `ec_precificacao`

### 3.1 SELECT

| Cenário | Resultado Esperado |
|---------|-------------------|
| Owner, Outro, Admin | ✅ (visibilidade de equipe) |
| Anon | ❌ |

### 3.2 INSERT

| Cenário | SQL | Resultado Esperado |
|---------|-----|-------------------|
| Owner na própria versão | `INSERT INTO ec_necessidades (versao_id, categoria, item, quantidade) VALUES ('<versao_owner>', 'CFTV', 'DVR', 1)` | ✅ |
| **Outro tentando inserir em versão alheia** | `INSERT INTO ec_necessidades (versao_id, categoria, item, quantidade) VALUES ('<versao_owner>', 'CFTV', 'Invasão', 1)` | ❌ **WITH CHECK falha** |
| Outro na própria versão | `INSERT INTO ec_necessidades (versao_id, categoria, item, quantidade) VALUES ('<versao_outro>', 'Rede', 'Switch', 1)` | ✅ |
| Admin em qualquer versão | qualquer versao_id | ✅ |
| Anon | qualquer INSERT | ❌ |

### 3.3 UPDATE

| Cenário | SQL | Resultado Esperado |
|---------|-----|-------------------|
| Owner atualizando linha própria | `UPDATE ec_necessidades SET item = 'Câmera PTZ' WHERE id = '<nec_owner>'` | ✅ |
| **Outro tentando atualizar linha alheia** | `UPDATE ec_necessidades SET item = 'Alterado' WHERE id = '<nec_owner>'` | ❌ **USING(ownership) falha — linha não é visível para UPDATE** |
| **Tentativa de roubo: trocar versao_id para versão própria** | `UPDATE ec_necessidades SET versao_id = '<versao_outro>' WHERE id = '<nec_owner>'` | ❌ **USING falha na linha original (pertence ao Owner)** |
| Admin | `UPDATE ec_necessidades SET quantidade = 10 WHERE id = '<nec_owner>'` | ✅ |
| Anon | qualquer UPDATE | ❌ |

> **Teste crítico do UPDATE:** O USING verifica a linha *antes* da mudança.
> Como `<nec_owner>` pertence à versão do Owner, o USING bloqueia qualquer Outro de
> sequer targetar essa linha, independente do novo valor do versao_id.

### 3.4 DELETE

| Cenário | SQL | Resultado Esperado |
|---------|-----|-------------------|
| Owner excluindo linha própria | `DELETE FROM ec_necessidades WHERE id = '<nec_owner>'` | ✅ |
| **Outro tentando excluir linha alheia** | `DELETE FROM ec_necessidades WHERE id = '<nec_owner>'` | ❌ **USING(ownership) falha** |
| Admin | `DELETE FROM ec_necessidades WHERE id = '<nec_owner>'` | ✅ |
| Anon | qualquer DELETE | ❌ |

---

## 4. ec_historico_versoes

### 4.1 SELECT

| Cenário | Resultado Esperado |
|---------|-------------------|
| Owner, Outro, Admin | ✅ todos os eventos visíveis |
| Anon | ❌ |

### 4.2 INSERT — foco na correção de segurança (#4 da auditoria)

| Cenário | SQL | Resultado Esperado |
|---------|-----|-------------------|
| Owner registrando evento na própria versão | `INSERT INTO ec_historico_versoes (versao_id, proposta_id, evento, user_id) VALUES ('<versao_owner>', '<proposta_owner>', 'editada', auth.uid())` | ✅ |
| **Outro tentando inserir evento em versão alheia** | `INSERT INTO ec_historico_versoes (versao_id, proposta_id, evento, user_id) VALUES ('<versao_owner>', '<proposta_owner>', 'aprovacao_concedida', auth.uid())` | ❌ **EXISTS(ownership) falha** |
| Outro registrando evento na própria versão | versao_id = `<versao_outro>` | ✅ |
| Qualquer usuário forjando user_id | `..., user_id = '<uid_outro>'` | ❌ viola `auth.uid() = user_id` |
| Admin em qualquer versão | qualquer versao_id | ✅ |
| Anon | qualquer INSERT | ❌ |

### 4.3 UPDATE e DELETE

| Cenário | Resultado Esperado |
|---------|-------------------|
| Qualquer usuário (incluindo Admin e Owner) | ❌ Sem política para UPDATE/DELETE → implicitamente negado. Registros são imutáveis. |

---

## 5. Tabelas de Catálogo e Configuração

(ec_categorias_produto, ec_fabricantes, ec_catalogo_itens, ec_fornecedores, ec_produto_fornecedor,
ec_kits, ec_kit_itens, ec_regras_composicao, ec_solucoes, ec_solucao_kits, ec_parametros_financeiros)

| Operação | Owner / Outro | Admin | Anon |
|----------|---------------|-------|------|
| SELECT | ✅ | ✅ | ❌ |
| INSERT | ❌ | ✅ | ❌ |
| UPDATE | ❌ | ✅ | ❌ |
| DELETE | ❌ | ✅ | ❌ |

---

## 6. ec_templates

| Operação | Owner | Outro | Admin | Anon |
|----------|-------|-------|-------|------|
| SELECT (próprios ou públicos) | ✅ | ✅ (só públicos) | ✅ | ❌ |
| INSERT (criando o próprio) | ✅ | ✅ | ✅ | ❌ |
| UPDATE (template alheio) | ✅ (próprio) | ❌ | ✅ | ❌ |
| DELETE (template alheio) | ✅ (próprio) | ❌ | ✅ | ❌ |

---

## 7. ec_visao_executiva (view)

| Cenário | SELECT | Observação |
|---------|--------|------------|
| Owner, Outro, Admin | ✅ | Todos os dados visíveis (SECURITY INVOKER + USING(true) nas tabelas base) |
| Anon | ❌ | |

**Risco operacional (não de segurança):** Se não existir registro em `ec_parametros_financeiros` com `chave = 'periodo_roi_meses' AND ativo = true`, a view retorna zero linhas para todos. Verificar existência do parâmetro antes de testar a view.

---

## 8. Matriz consolidada de resultado esperado

### Tabelas filhas (ec_necessidades como representante)

|  | Owner (linha própria) | Outro (linha alheia) | Admin (qualquer linha) | Anon |
|--|----------------------|---------------------|------------------------|------|
| **SELECT** | ✅ | ✅ | ✅ | ❌ |
| **INSERT** (versão própria) | ✅ | ❌ | ✅ | ❌ |
| **INSERT** (versão alheia) | — | ❌ | ✅ | ❌ |
| **UPDATE** | ✅ | ❌ | ✅ | ❌ |
| **UPDATE** (trocando versao_id) | ❌ (viola WITH CHECK) | ❌ (viola USING) | ❌ (viola WITH CHECK) | ❌ |
| **DELETE** | ✅ | ❌ | ✅ | ❌ |

> **UPDATE trocando versao_id:** mesmo o Owner não pode mover um registro da própria versão para outra versão que não lhe pertença. O WITH CHECK verifica o novo versao_id.

### ec_versoes

|  | Owner | Outro | Admin | Anon |
|--|-------|-------|-------|------|
| **SELECT** | ✅ | ✅ | ✅ | ❌ |
| **INSERT** (proposta própria) | ✅ | ❌ | ✅ | ❌ |
| **INSERT** (proposta alheia) | ❌ | ❌ | ✅ | ❌ |
| **UPDATE** | ✅ | ❌ | ✅ | ❌ |
| **DELETE** | ❌ | ❌ | ✅ | ❌ |

### ec_historico_versoes

|  | Owner | Outro | Admin | Anon |
|--|-------|-------|-------|------|
| **SELECT** | ✅ | ✅ | ✅ | ❌ |
| **INSERT** (versão própria) | ✅ | ❌ | ✅ | ❌ |
| **INSERT** (versão alheia) | ❌ | ❌ | ✅ | ❌ |
| **UPDATE** | ❌ | ❌ | ❌ | ❌ |
| **DELETE** | ❌ | ❌ | ❌ | ❌ |

---

## 9. Critério de aceite do Security Patch

O módulo está apto para produção quando **todos** os seguintes testes passarem:

- [ ] Outro **não consegue** fazer DELETE em nenhuma linha de tabela filha alheia
- [ ] Outro **não consegue** fazer UPDATE em nenhuma linha de tabela filha alheia
- [ ] Outro **não consegue** mover registros trocando `versao_id` (UPDATE bloqueado pelo USING na linha original)
- [ ] Outro **não consegue** criar `ec_versoes` para propostas alheias
- [ ] Outro **não consegue** inserir em `ec_historico_versoes` com `versao_id` alheio
- [ ] Owner **consegue** realizar todas as operações CRUD nas próprias propostas e versões
- [ ] Admin **consegue** realizar todas as operações em qualquer proposta
- [ ] Anon **não consegue** realizar nenhuma operação em nenhuma tabela
- [ ] Triggers de sistema (`ec_log_versao_status`, `ec_prec_sync_status`, `ec_enforce_single_current_version`) **continuam funcionando** após aplicar as políticas

---

## 10. Notas sobre triggers e SECURITY DEFINER

| Trigger | Tabela | SECURITY DEFINER? | Efeito no RLS |
|---------|--------|-------------------|---------------|
| `ec_log_versao_status` | `ec_historico_versoes` | ✅ Sim | Bypassa RLS — insere eventos automáticos independentemente das políticas |
| `ec_prec_sync_status` | `ec_versoes` | ❌ Não | Sujeito ao RLS — UPDATE em `ec_versoes` requer ser owner. Como o trigger é disparado pelo próprio owner ao salvar precificação, funciona corretamente |
| `ec_enforce_single_current_version` | `ec_versoes` | ❌ Não | Sujeito ao RLS — faz UPDATE em versões da mesma proposta. Com a nova política INSERT (owner exigido), todas as versões de uma proposta têm o mesmo `created_by`, portanto o UPDATE do trigger passa |
| `ec_versoes_updated_at` / `ec_projeto_dados_updated_at` | variadas | N/A (BEFORE trigger) | Executa dentro da mesma transação do usuário — sujeito ao RLS da operação que o disparou |
