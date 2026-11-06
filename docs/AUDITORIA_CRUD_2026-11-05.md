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

Evidências: [antes](correcoes-2026-11-05/banco-antes.json), [teste na cópia](correcoes-2026-11-05/banco-teste.json) e [depois](correcoes-2026-11-05/banco-depois.json). Os documentos contêm contagens e hashes, sem dados pessoais. O backup e a cópia com dados originais ficaram na pasta local `.verification`, fora das evidências públicas.

Os testes de escrita usaram exclusivamente bancos de fixtures em `docs/correcoes-2026-11-05/.data` e o banco de regressão dedicado. Nenhum teste de cadastro/captura/equipe foi executado no `dev.db` original. Não houve reset, migration destrutiva ou alteração do `.env` existente.

## 4. PokéAPI: causa da falha e verificação real

A chamada original foi reproduzida com Axios: DNS resolvia normalmente, mas a conexão de saída HTTPS falhava com **EACCES**. Com autorização de rede no processo de verificação, a mesma URL respondeu **HTTP 200, pikachu**. Isso identifica o bloqueio de saída do ambiente de execução como a causa observada nesta sessão, sem exigir substituição do cliente HTTP.

Foram verificados dados reais: catálogo, busca, tipo elétrico, ordenação alfabética/decrescente, paginação, descrição, imagens, seis estatísticas, evoluções e correspondência do ID local após sincronização. As ramificações de Eevee também foram consultadas na API real.

Nenhum mock permanente, desativação de TLS ou dataset substituto foi introduzido. As fixtures artificiais pertencem apenas aos testes de banco. O serviço mantém timeout, cache e distinção entre 404 e 503. Em outro ambiente com saída bloqueada, continuará sendo necessário liberar HTTPS para a PokéAPI; o aplicativo devolve indisponibilidade.

Evidências: [suíte real original](correcoes-2026-11-05/pokeapi.log), [regressões HTTP](correcoes-2026-11-05/regressoes-http.json) e [log das regressões](correcoes-2026-11-05/regressoes-http.log).

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

Resultados estruturados: [unitários](correcoes-2026-11-05/unitarios.json), [HTTP guard](correcoes-2026-11-05/http-guard.json), [lint](correcoes-2026-11-05/lint-resumo.json), [navegação](correcoes-2026-11-05/navegacao/resultados.json), [visual](correcoes-2026-11-05/visual/visual-results.json), [recuperação](correcoes-2026-11-05/recuperacao/recovery-results.json).

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


---

# Histórico: auditoria inicial antes das correções

Data: 05/11/2026, America/Sao_Paulo.

**Parecer na auditoria inicial: os CRUDs centrais estão implementados e passaram nos fluxos usuais, mas o projeto ainda precisa de correções para ser considerado integralmente validado.** Há falhas reproduzidas de autenticação e tratamento de entradas, recuperação de senha sem configuração local e diferenças pontuais em relação ao planejamento.

Esta é uma nova auditoria. Os relatórios anteriores foram consultados como histórico; seus resultados não foram tratados como execução atual. O código funcional não foi corrigido nesta rodada. Foram acrescentados somente documentação, scripts de diagnóstico e evidências; builds atualizaram arquivos gerados.

## Referência e interpretação do escopo

Referência primária: [planejamento original](../RelatorioPrototipoFrontend208596.pdf), 18 páginas. O texto completo foi extraído e a página 2, que contém a matriz dos CRUDs, foi renderizada e inspecionada: [imagem da matriz](auditoria-2026-11-05/requisitos-pagina-2.png).

O documento chama o painel do treinador de área administrativa. Ele não exige um administrador global capaz de modificar todos os usuários. Também não exige exclusão independente de perfil, CRUD manual de espécies, edição manual de XP ou remoção manual de insígnias. A ausência dessas operações não caracteriza descumprimento.

| Requisito | Implementação encontrada | Resultado |
|---|---|---|
| Área pública | Home, catálogo, detalhes, ranking e links de autenticação | Rotas e componentes presentes; integração externa não revalidada com sucesso nesta rodada |
| Cadastro e autenticação | Conta/perfil criados juntos, bcrypt, JWT, cookie HttpOnly e sessão | Fluxos usuais aprovados; limite de senha precisa de correção |
| Conta/perfil: criar, consultar, editar | `/auth/register`, `/profiles/me`, formulário `/perfil` | Aprovados nos cenários exercitados; rota legada `/users` gera inconsistência de nome |
| Captura: criar | Modal com espécie, apelido, nível, data e observações; sincronização da espécie e registro ligado ao usuário | Presente; persistência local aprovada com espécie de teste |
| Captura: consultar | Coleção, filtros, ordenação e modal de detalhes | Presente; consulta/isolamento aprovados na API |
| Captura: editar | PATCH dos dados próprios | Fluxo usual aprovado; formato de data aceito no DTO pode causar 500 |
| Captura: excluir | Confirmação, DELETE e remoção dos vínculos em equipes | Aprovado; XP recalculado e conquistas mantidas |
| Equipe: criar/consultar/editar/excluir | Modal e lista; nomes, descrição, principal e integrantes | Fluxos usuais aprovados; há entradas inválidas aceitas ou convertidas em 500 |
| Até seis integrantes da própria coleção | Validação no DTO e service, checagem de proprietário e duplicidade | Aprovado pela integração existente |
| Insígnias automáticas | Oito regras, progresso, concessão idempotente e permanência das conquistas | Oito regras aprovadas na integração |
| Progressão e ranking | XP e nível derivados; ranking e ordenações; gráfico mensal | Implementados; limitações semânticas descritas abaixo |
| Recuperação de senha | Solicitação, token com prazo/uso único, SMTP e redefinição | Implementação presente; configuração SMTP ausente no `.env` local |
| Navegação privada persistente | TrainerShell nas rotas privadas | Parcial: catálogo e ranking usam layout público ao serem acessados pelo menu privado |
| Responsividade, teclado e contraste | CSS responsivo, dialog nativo e rótulos | Não certificados nesta rodada; não foi repetida a suíte visual nem feita auditoria de acessibilidade |

## Achados reproduzidos e prioridade de correção

### 1. Alta: cadastro aceita senhas que a autenticação não distingue integralmente

Arquivos: [DTO de cadastro](../app/app-backend/projeto%20pokedex/src/dtos/register-dto.ts), [DTO legado](../app/app-backend/projeto%20pokedex/src/dtos/create-users-dto.ts), [criação da conta](../app/app-backend/projeto%20pokedex/src/users/users.service.ts).

O cadastro valida somente comprimento mínimo e usa bcrypt. Registrei uma conta com 72 caracteres `a` seguidos de `X`; o login com os mesmos 72 caracteres seguidos de `Y` também retornou **201**. Portanto, duas senhas diferentes aceitas pela interface são tratadas como equivalentes. Isso não demonstra acesso a uma conta com senha arbitrária; demonstra que o contrato de senha permite informação que não participa da comparação.

A redefinição já rejeita senhas acima de 72 bytes UTF-8, mas cadastro e criação legada não. Uniformizar o limite em bytes na entrada e comunicar o limite no formulário. Cobrir também caracteres multibyte; um limite apenas de caracteres não resolve o caso.

### 2. Média: conflito de e-mail vira erro interno na atualização legada

Arquivo: [UsersService.updateUser](../app/app-backend/projeto%20pokedex/src/users/users.service.ts), linha 36.

Atualizar a própria conta para um e-mail já pertencente a outra conta retorna **500 Internal server error**. O service não traduz a violação de unicidade do Prisma para uma resposta de conflito. O fluxo `/profiles/me` já possui esse tratamento e retorna 409.

Correção recomendada: tratar P2002 em `/users/:id`, manter a unicidade no banco e devolver 409 com mensagem compreensível. Uma consulta prévia isolada não substitui o tratamento da constraint.

### 3. Média: data aceita no DTO falha ao editar captura

Arquivos: [DTO de captura](../app/app-backend/projeto%20pokedex/src/dtos/captured-pokemon-dto.ts), [CapturedPokemonService.update](../app/app-backend/projeto%20pokedex/src/captured-pokemon/captured-pokemon.service.ts).

`PATCH /api/captured-pokemon/:id` com `captureDate: "2026-11-06"` passa pela validação de data, mas retorna **500**. Na criação, o service converte a string em `Date`; na edição, repassa os dados diretamente ao Prisma. A tela atual envia timestamp completo e não reproduz esse erro no uso habitual, mas a API aceita um formato que não consegue persistir.

Correção recomendada: converter a data também na edição ou restringir explicitamente o formato aceito, devolvendo 400 para formatos incompatíveis.

### 4. Média: `isActive: null` passa pela validação e provoca 500

Arquivos: [TeamDto](../app/app-backend/projeto%20pokedex/src/dtos/team-dto.ts), [TeamsService.save](../app/app-backend/projeto%20pokedex/src/teams/teams.service.ts).

Editar uma equipe com nome válido e `isActive: null` retorna **500**. O campo é opcional no DTO, o que também ignora a validação para null, mas o banco exige booleano não nulo. O formulário normal envia booleano; o defeito está na robustez da API.

Correção recomendada: distinguir campo ausente de null e rejeitar null com 400 para campos não anuláveis. Revisar os demais DTOs opcionais com o mesmo critério.

### 5. Média: nome alterado em `/users` não é atualizado no perfil/ranking

Arquivos: [UsersService.updateUser](../app/app-backend/projeto%20pokedex/src/users/users.service.ts), [LeaderboardService](../app/app-backend/projeto%20pokedex/src/leaderboard/leaderboard.service.ts).

Após editar o nome pela rota legada, a conta passou a apresentar `Audit Renamed`, mas `profile.trainerName` continuou como `Audit Alpha`. O ranking prioriza `profile.trainerName`, portanto pode manter o nome anterior. `/profiles/me` atualiza os dois campos em transação e não apresenta essa divergência.

Correção recomendada: centralizar a alteração dos dados compartilhados entre conta/perfil ou reutilizar o fluxo transacional existente.

### 6. Média: tela `/admin/users` cria registros que não aparecem para quem os criou

Arquivos: [tela legada de usuários](../app/frontapp/app/admin/users/page.tsx), [UsersController](../app/app-backend/projeto%20pokedex/src/users/users.controller.ts).

O POST cria outra conta e retorna 201. A consulta seguinte retorna apenas a conta autenticada; editar/excluir também se restringem ao próprio ID. Reproduzido: conta de ID 3 criada, listagem contendo somente ID 1. A autorização protege os dados, mas o formulário sugere um gerenciamento que não existe.

Isso é uma inconsistência da tela legada, não evidência de que o PDF exige gestão global. Recomenda-se alinhar a tela ao gerenciamento da própria conta e direcionar novos usuários ao cadastro. Não ampliar permissões como solução automática.

### 7. Média: recuperação de senha indisponível na configuração local

Os campos SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM e PASSWORD_RESET_URL não estão preenchidos no `.env` do backend. Foi verificada apenas a presença dos campos, sem expor valores. A chamada no ambiente isolado sem SMTP retornou **503**, com mensagem de indisponibilidade.

O código de recuperação existe e há evidências históricas de teste SMTP local, mas isso não comprova entrega atual por Gmail. Configurar e validar o provedor em ambiente apropriado antes de declarar a funcionalidade operacional. Nenhum e-mail real foi enviado nesta auditoria.

### 8. Baixa: equipe aceita nome formado apenas por espaços

`POST /api/teams` com `name: "   "` retorna **201**. O comprimento mínimo é satisfeito sem conteúdo visível. Aplicar trim antes da validação e exigir conteúdo; revisar a mesma regra para nomes de usuário/treinador quando aplicável.

## Outros pontos da análise de código

- **Menu privado:** `/pokedex` e `/ranking` renderizam Header/Footer públicos fora do TrainerShell. Ao navegar para essas páginas pelo painel, a sidebar desaparece, contrariando a persistência descrita no planejamento.
- **Salvar equipe:** o botão Cancelar é desabilitado durante o envio, mas Escape, backdrop e fechar janela continuam chamando `onClose`. Por inspeção, é possível encerrar o modal enquanto a gravação está em andamento, deixando incerto para o usuário se o registro foi salvo. Não foi reproduzido em navegador nesta rodada.
- **Nomes e limites do catálogo:** a página se apresenta como Pokédex Nacional, mas o catálogo é limitado às 151 espécies de Kanto. O sync em lote usa 150; sincronização individual continua disponível. Alinhar rótulo e escopo ou ampliar os limites conforme decisão do projeto.
- **Linha evolutiva:** o service achata a árvore em uma lista. Espécies com ramificações não preservam visualmente a relação entre os caminhos evolutivos. É uma limitação de representação, não ausência dos dados de evolução.
- **Resumo de equipes:** o frontend mostra nível médio e número de tipos. O protótipo menciona força média/cobertura; não há uma fórmula definida de combate nem matriz de cobertura ofensiva/defensiva. Registrar essa adaptação de escopo.
- **Progressão:** XP = 10 por captura atual + 50 por insígnia; nível = floor(XP/100)+1. A exclusão reduz o XP de captura. O gráfico usa registros ainda existentes, não um histórico imutável. A própria tela informa essa limitação.
- **Escalabilidade:** coleção, equipes e ranking são carregados integralmente; há filtragem/ordenação no navegador. Não foi medida a capacidade com grandes volumes. O catálogo externo possui paginação; isso não se estende às coleções privadas.
- **Manutenção:** frontend/backend têm separação de responsabilidades e módulos de domínio. Vários componentes e services estão condensados em linhas longas, dificultando manutenção. Há hash padrão de senha no schema legado; a API atual sempre calcula o hash, mas inserções externas que omitam a senha podem herdar esse padrão.
- **Documentação:** os READMEs principais continuam majoritariamente os padrões de Next/Nest; o frontend orienta porta 3000, embora `dev` use 3001. Os relatórios históricos também registram estados de rodadas distintas. Consolidar instruções atuais de setup, banco, variáveis e testes.

## Verificações executadas nesta rodada

| Verificação | Resultado |
|---|---|
| Build NestJS | Aprovado |
| Build Next.js de produção | Aprovado; todas as páginas previstas geradas |
| TypeScript frontend, `tsc --noEmit` | Aprovado |
| Unitários com o comando configurado no package.json | 2 suítes, 17 testes aprovados |
| E2E HTTP | 1 suíte, 4 testes aprovados; escopo limitado ao guard de autenticação |
| Integração existente em banco dedicado | Aprovada: contas, sessão, perfil, isolamento, captura, equipes, exclusões, progressão e oito regras de insígnias |
| Casos adicionais | 21 observações registradas; incluem sucessos e falhas esperadas/reproduzidas |
| Lint frontend | 0 erros e 12 avisos |
| Lint backend sem `--fix` | 540 erros e 5 avisos; 527 ocorrências de formatação |
| Cinco migrations aplicadas em banco vazio de auditoria | Aprovadas por execução SQL, sem reset do banco original |
| Chaves estrangeiras do banco original | Nenhuma violação detectada, consulta em modo somente leitura |
| Integridade do arquivo original | SHA-256 e tamanho idênticos antes/depois |
| PokéAPI real | A tentativa falhou com indisponibilidade; causa externa/rede/serviço não determinada |
| Teste atual de Gmail real | Não executado; configuração ausente |
| Nova suíte visual, contraste e leitor de tela | Não executados |

A primeira tentativa de Jest sem a flag ESM falhou na configuração TypeScript. A execução subsequente usou `--experimental-vm-modules`, como os scripts oficiais do projeto, e passou. Não se trata de falha dos comandos de teste declarados no package.json.

O lint foi executado diretamente sem `--fix`, para não alterar o código durante a análise. A maior parte dos erros do backend é formatação, mas a checagem permanece reprovada e também há ocorrências de tipagem/uso inseguro. Os 4 testes E2E não representam cobertura completa das entidades; a integração com banco foi executada separadamente.

## Preservação e evidências

Foram criados bancos exclusivos em `docs/auditoria-2026-11-05/test.db` e `regressao.db`. As espécies artificiais e contas de diagnóstico pertencem somente a esses bancos. A suíte existente foi reutilizada por um wrapper que substitui apenas o caminho de isolamento para o banco dedicado desta auditoria; o arquivo original da suíte foi preservado.

- [Resumo das verificações](auditoria-2026-11-05/resumo.json).
- [21 casos adicionais e respostas HTTP](auditoria-2026-11-05/casos-adicionais.json).
- [Script dos casos adicionais](auditoria-2026-11-05/verificar.cjs), preparado para banco recém-criado com as migrations; não executar repetidamente sobre o mesmo banco de fixtures.
- [Wrapper da regressão existente](auditoria-2026-11-05/regressao.cjs).
- [Lint consolidado](auditoria-2026-11-05/lint-resumo.json), [frontend](auditoria-2026-11-05/frontend-lint.json) e [backend](auditoria-2026-11-05/backend-lint.json).
- [Banco original antes](auditoria-2026-11-05/banco-original-antes.json) e [depois](auditoria-2026-11-05/banco-original-depois.json).

Os caminhos de runtime foram usados diretamente porque Node/npm não estavam no PATH da sessão. Não foi necessário reinstalar dependências. Não houve instalação limpa, auditoria de dependências, teste de carga, implantação HTTPS nem certificação de ausência de vulnerabilidades.

## Ordem recomendada para concluir

1. Uniformizar validação de senha com limite de bytes em cadastro/criação e redefinição.
2. Corrigir conflitos de e-mail, datas de captura e campos null para respostas 400/409 coerentes.
3. Centralizar atualização de conta/perfil e alinhar a tela legada de usuários ao escopo real.
4. Configurar e validar recuperação de senha; repetir a integração real da PokéAPI quando disponível.
5. Ajustar navegação persistente, nomes sem conteúdo e fechamento do modal durante envio.
6. Resolver lint, atualizar instruções de execução e executar a regressão visual/acessibilidade após as correções.

Os fluxos principais de captura e equipe atendem ao CRUD pedido. Os pontos acima impedem afirmar que todo o projeto está sem pendências.
