# Correções da auditoria CRUD — resultado final

Atualização: 05/11/2026, America/Sao_Paulo. Esta seção substitui o parecer inicial para o estado atual do código. O diagnóstico anterior foi mantido abaixo como histórico.

**Resultado: os defeitos confirmados de código foram corrigidos e os testes finais executados passaram. Os CRUDs estão aptos à apresentação acadêmica. A entrega integral com envio real de recuperação de senha ainda depende da configuração SMTP do projeto.** Não há credenciais disponíveis para concluir essa etapa operacional, e o teste SMTP local não foi apresentado como envio real pelo Gmail.

## 1. Correções implementadas

| Achado | Correção | Evidência atual |
|---|---|---|
| Senhas equivalentes após o byte 72 | Política comum de até 72 bytes UTF-8 no cadastro, criação legada, login e redefinição; validação também nos services e formulários | Testes unitários e regressões HTTP com ASCII, multibyte, limite exato e hashes legados |
| E-mail duplicado retornava 500 | Tratamento de P2002 para 409 na criação/atualização, incluindo conflito concorrente detectado pelo banco | Regressão HTTP verifica 409 e rollback da alteração de nome |
| Edição de data de captura retornava 500 | Conversão para Date tanto na criação quanto na edição; calendário estrito no DTO; mesma conversão para nascimento no perfil legado | Datas curtas e timestamps persistidos; datas impossíveis e null retornam 400 |
| `isActive: null` retornava 500 | Decorador opcional distingue undefined de null; tipos booleanos reais são obrigatórios quando informados | POST/PATCH rejeitam null, texto e número com 400 |
| Campos opcionais inválidos chegavam ao Prisma | Política estendida aos DTOs de capturas, equipes, login, usuários e perfil | Regressões para datas, nível e booleanos null |
| Conta criada não aparecia na lista | Vínculo opcional `createdById` atribuído somente no servidor; GET lista a própria conta e as contas cadastradas por ela | API e navegador confirmam persistência após nova consulta/recarga |
| Risco de ampliar acesso indevidamente | Listagem continua limitada; edição e exclusão permanecem restritas à própria conta; frontend não oferece ações em contas de terceiros | Outra conta não vê o cadastro; alteração/exclusão alheia retorna 403; atribuição de criador pelo cliente retorna 400 |
| Nomes divergentes entre conta/perfil/ranking | Função transacional compartilhada atualiza User.name, Profile.fullName e Profile.trainerName em todos os caminhos de edição | Regressões em `/users/:id`, `/profiles/me` e `/profiles/:id`; ranking e sidebar atualizados |
| Nomes de equipe só com espaços | Trim antes da validação de nome; aplicado também aos nomes de conta/perfil | Nomes sem conteúdo retornam 400; nome válido é normalizado |
| Sidebar desaparecia | Layout compartilhado escolhe navegação pública ou TrainerShell por sessão; aplicado ao catálogo, ranking e detalhes | Navegador valida acesso público, autenticação, recarga por cookie e logout |
| Modal de equipe fechava durante envio | Fechamento por Escape, botão e backdrop respeita `busy`, além do botão Cancelar | Requisição atrasada controladamente; Escape e fechar mantêm o modal até persistir |
| Catálogo “Nacional” com escopo Kanto | Título/texto ajustados para Kanto; sync em lote alinhado às 151 espécies | Build e regressão visual atualizados; integração real preservada |
| Evoluções sem origem explícita | API preserva a origem em `evolvesFrom`; ficha informa “Evolui de…” para cada evolução | Dados reais de Pikachu/Raichu e ramificações Eevee/Vaporeon/Jolteon/Flareon verificados |
| 540 erros e 5 avisos de lint backend | Formatação automática segura, remoção de imports/parâmetros sem uso, métodos sem async desnecessário, tipagem do servidor HTTP e checagem explícita da chave do cache | ESLint final: **0 erros e 0 avisos**, sem desabilitar regras do backend |
| Instruções e portas incoerentes | READMEs atualizados; `npm start` do frontend usa 3001, assim como `dev`, evitando conflito com a API | Configuração documentada; frontend de produção foi exercitado na porta 3001 |

As regras de XP, as oito insígnias, o máximo de seis integrantes, o vínculo das capturas ao treinador e as exclusões em cascade foram preservados. Não foram acrescentados papéis de administrador global, batalhas, upload ou edição manual de XP.

## 2. Segurança de senha e compatibilidade

A limitação foi confirmada na biblioteca bcryptjs instalada e em teste: comparar dois valores com prefixo idêntico de 72 bytes pode produzir o mesmo resultado se houver sufixos diferentes. A aplicação agora rejeita esses valores com HTTP 400 **antes da comparação**, em vez de aceitar a truncagem. O limite é em bytes UTF-8, não em caracteres; 36 caracteres `é` ocupam 72 bytes e continuam válidos, enquanto 37 são recusados.

Os hashes existentes não foram reescritos, a arquitetura bcrypt/JWT foi preservada e senhas legadas dentro do limite continuam autenticando. Senhas não são aparadas, normalizadas ou cortadas pelo código. Foram removidos limites de campo que poderiam cortar a entrada silenciosamente; o formulário exibe o erro explícito pelo tamanho em bytes.

**Limitação inevitável do histórico:** se uma conta antiga foi cadastrada com senha maior que 72 bytes, o hash não contém informação capaz de validar o sufixo perdido. Não é possível recuperar ou distinguir esses bytes por uma atualização do código. A entrada longa é recusada e a interface orienta redefinição. Não foi feita migração automática que aceite uma senha ambígua. Contas e hashes foram preservados.

## 3. Banco e autorização

A migration `20261105150000_account_creator` executa somente ADD COLUMN anulável e CREATE INDEX. O vínculo é uma relação opcional de User para User, com ON DELETE SET NULL; nenhuma conta antiga recebe criador inventado. Excluir o criador não apaga as outras contas.

Procedimento executado:

1. Backup SQLite consistente em `app/app-backend/projeto pokedex/.verification/pre-correcoes-20261105.db` e hashes por tabela/colunas anteriores.
2. Aplicação de `prisma migrate deploy` primeiro em cópia do banco original; comparação de todos os registros/colunas anteriores aprovada.
3. Aplicação da mesma migration no banco original; nova comparação aprovada e `foreign_key_check` sem violações.
4. Rechecagem ao final dos testes: registros anteriores continuam idênticos. O arquivo do banco muda por conter a nova coluna, índice e migration; sua preservação foi comprovada pelos dados anteriores, não por um hash de arquivo que necessariamente mudaria.

Evidências: [antes](banco-antes.json), [teste na cópia](banco-teste.json) e [depois](banco-depois.json). Os documentos contêm contagens e hashes, sem dados pessoais. O backup e a cópia com dados originais ficaram na pasta local `.verification`, fora das evidências públicas.

Os testes de escrita usaram exclusivamente bancos de fixtures em `docs/correcoes-2026-11-05/.data` e o banco de regressão dedicado. Nenhum teste de cadastro/captura/equipe foi executado no `dev.db` original. Não houve reset, migration destrutiva ou alteração do `.env` existente.

## 4. PokéAPI: causa da falha e verificação real

A chamada original foi reproduzida com Axios: DNS resolvia normalmente, mas a conexão de saída HTTPS falhava com **EACCES**. Com autorização de rede no processo de verificação, a mesma URL respondeu **HTTP 200, pikachu**. Isso identifica o bloqueio de saída do ambiente de execução como a causa observada nesta sessão, sem exigir substituição do cliente HTTP.

Foram verificados dados reais: catálogo, busca, tipo elétrico, ordenação alfabética/decrescente, paginação, descrição, imagens, seis estatísticas, evoluções e correspondência do ID local após sincronização. As ramificações de Eevee também foram consultadas na API real.

Nenhum mock permanente, desativação de TLS ou dataset substituto foi introduzido. As fixtures artificiais pertencem apenas aos testes de banco. O serviço mantém timeout, cache e distinção entre 404 e 503. Em outro ambiente com saída bloqueada, continuará sendo necessário liberar HTTPS para a PokéAPI; o aplicativo devolve indisponibilidade.

Evidências: [suíte real original](pokeapi.log), [regressões HTTP](regressoes-http.json) e [log das regressões](regressoes-http.log).

## 5. Testes executados após as correções

| Verificação | Resultado final |
|---|---|
| Build backend NestJS | Aprovado |
| Build frontend Next.js de produção | Aprovado; todas as rotas previstas compiladas |
| TypeScript backend e frontend, `tsc --noEmit` | Aprovados |
| Unitários Jest | **25 testes em 4 suítes aprovados**; oito testes novos de regressão |
| E2E HTTP do guard | **4 testes aprovados** |
| Integração existente de banco | Aprovada: autenticação, cookie, perfil, capturas, equipes, isolamento, progressão e oito insígnias |
| Novas regressões HTTP com banco novo | **9 grupos aprovados**, com múltiplas assertions de senha, nomes, listagem, conflitos, datas, permissões, seis integrantes, exclusões e PokéAPI real |
| Suíte original da PokéAPI real | Aprovada |
| Regressão visual existente | **35 screenshots**, desktop 1440×1000 e celular 390×844; sem overflow horizontal ou pageerror |
| Novos cenários de navegação/listagem/modal | **5 cenários aprovados**, sem pageerror |
| Recuperação de senha com SMTP TLS local | API e navegador aprovados, incluindo expiração, uso único, concorrência, falha SMTP, limites, novo login e revogação de sessões |
| Lint backend | **0 erros, 0 avisos** |
| Lint frontend | **0 erros, 12 avisos**; 11 sobre imagens nativas e um sobre redirecionamento relativo |
| Preservação do banco original | Todos os registros/campos anteriores preservados; nenhuma violação de chave estrangeira |

Não há testes finais reprovados. Durante a implementação, o lint frontend detectou uma chamada de carregamento dentro de effect; ela foi substituída por callbacks assíncronos com controle de desmontagem e a checagem final passou. O EACCES inicial foi resolvido apenas para os processos de teste por autorização de rede. Nenhuma regra foi desativada para obter aprovação do backend.

Resultados estruturados: [unitários](unitarios.json), [HTTP guard](http-guard.json), [lint](lint-resumo.json), [navegação](navegacao/resultados.json), [visual](visual/visual-results.json), [recuperação](recuperacao/recovery-results.json).

Foram inspecionadas visualmente imagens renderizadas do catálogo autenticado em desktop e celular. As assertions automatizadas cobrem os demais fluxos descritos; isso não constitui certificação completa de acessibilidade ou comparação pixel a pixel.

## 6. Arquivos modificados

Backend, alterações funcionais e regressões:

- `src/auth/password-policy.ts` e `.spec.ts`; `auth.service.ts`, `auth.controller.ts`, `password-reset.service.ts`, `reset-password.dto.ts`.
- `src/database/account-data.ts` — estratégia transacional compartilhada e tratamento de conflitos.
- `src/dtos/input-transforms.ts`, `parse-date.ts`, `validation.spec.ts` e DTOs de registro, login, usuários, perfil, capturas e equipes.
- `src/users/users.controller.ts`, `users.service.ts`, `users.module.ts`.
- `src/profiles/profiles.service.ts`, `profiles.module.ts`.
- `src/captured-pokemon/captured-pokemon.service.ts`.
- `src/pokemon/pokeapi.service.ts`, `pokemon.service.ts`, `pokemon.controller.ts`.
- `src/badges/badges.controller.ts` e `badges.service.ts` — correções de lint sem concessão manual de conquistas.
- `test/app.e2e-spec.ts` — tipagem correta do servidor HTTP.
- `prisma/schema.prisma`, nova migration e Prisma Client regenerado.
- `scripts/verify-audit-fixes.cjs` e README.

Formatação segura também alcançou módulos/controllers/services existentes de app, banco, capturas, badges, leaderboard, profiles, progression, teams e o teste de guard, conforme as regras Prettier já existentes. Não houve reescrita da arquitetura nem redução das regras de lint.

Frontend:

- `app/components/PublicTrainerLayout.tsx` (novo).
- `app/components/AuthForm.tsx`, `PasswordRecoveryForm.tsx`, `TeamBuilder.tsx`, `PokemonDetails.tsx`.
- `app/admin/users/page.tsx`, `app/login/auth_service.ts`, `app/lib/api.ts`.
- `app/pokedex/page.tsx`, `app/pokedex/[id]/page.tsx`, `app/ranking/page.tsx`.
- `scripts/verify-navigation.cjs` (novo), `scripts/verify-visual.cjs` (título atualizado).
- `package.json` e README.

Documentação/evidências: `docs/AUDITORIA_CRUD_2026-11-05.md` e `docs/correcoes-2026-11-05/`. Os registros anteriores da auditoria foram mantidos como histórico. Não houve commit, publicação ou reset de repositório.

## 7. Limitações restantes e parecer para entrega

1. **SMTP real pendente:** SMTP_USER, SMTP_PASS e SMTP_FROM precisam ser fornecidos/configurados pelo responsável, com os demais campos do modelo `.env.example`. O envio Gmail real não foi executado. Nenhuma mensagem foi enviada a endereços reais. O fluxo de recuperação e suas proteções passaram com SMTP TLS local.
2. **Senhas legadas acima de 72 bytes:** exigem redefinição, pois o bcrypt já descartou o sufixo no cadastro antigo. A rejeição explícita é uma correção de segurança; não é possível reconstruir o sufixo perdido. Demais autenticações e contas foram preservadas.
3. **Avisos frontend:** permanecem os 12 avisos descritos, sem erros de lint ou build. Não bloqueiam os fluxos exercitados; otimização de imagens e adaptação geral de redirecionamento não foram tratadas como defeitos funcionais novos.
4. **Escopo preservado:** gráfico de XP reflete capturas existentes e insígnias; resumo de equipe usa nível médio/número de tipos, sem inventar fórmula de batalha. Não houve testes de carga, auditoria exaustiva de contraste/leitor de tela, instalação limpa em outra máquina ou implantação HTTPS.
5. **Dívida histórica de schema:** o hash padrão legado de senha permanece; a API sempre exige senha e calcula seu hash. Não foi removido por uma alteração que exigisse redefinição de tabela nesta rodada. Inserções externas à API devem informar senha própria.

**Parecer:** o projeto está pronto para demonstrar os CRUDs e os fluxos acadêmicos testados. Para declarar a entrega integral sem pendência funcional de e-mail, falta configurar e validar o provedor SMTP real. Esta dependência externa está separada das correções de código concluídas.
