# Análise técnica e validação da Pokédex

Atualização: 04/11/2026 (America/Sao_Paulo), após a implementação da recuperação de senha com Gmail SMTP.

## 1. Escopo e estado da entrega

Aplicação existente preservada e estendida incrementalmente. Não houve recriação dos projetos, commits ou reset de banco. A rodada de recuperação aplicou uma migration aditiva após backup e teste em banco descartável, preservando todos os registros e campos anteriores. Frontend e backend continuam independentes. Os arquivos que já estavam modificados/não rastreados foram preservados.

Referência: [PDF original](../RelatorioPrototipoFrontend208596.pdf). O documento tem 18 páginas, com 15 imagens de telas nas páginas 4 a 18. O caminho `docs/RelatorioPrototipoFrontend208596.pdf` citado no pedido não existe; o arquivo está na raiz, sem movimentação ou duplicação.

A validação visual usa Chrome headless controlado diretamente por Playwright, com perfil isolado, URL explícita e dados reais da PokéAPI. Não depende da barra de endereços do navegador do usuário. Evidências atuais da recuperação e regressão ficam em [recuperacao](recuperacao/); [finalizacao](finalizacao/) preserva a rodada funcional; [validacao](finalizacao/) preserva a rodada anterior. A validação cobre os cenários descritos; não é garantia de ausência de todos os defeitos ou certificação de acessibilidade.

**Estado:** os onze fluxos principais solicitados foram exercitados; CRUDs, autorização e PokéAPI aprovados nos cenários descritos. A recuperação da tela 06 foi implementada e testada com SMTP TLS local; a entrega real pelo Gmail permanece sem verificação, pois as variáveis SMTP ainda não estão configuradas. Não classificar o projeto como totalmente concluído enquanto houver requisitos essenciais pendentes.

## 2. Estrutura e tecnologias

| Diretório | Responsabilidade |
|---|---|
| `app/frontapp/app` | Next.js App Router, páginas, componentes, CSS e cliente HTTP |
| `app/frontapp/app/(trainer)` | Layout compartilhado e páginas privadas do treinador |
| `app/frontapp/app/admin` | Área administrativa preexistente, com acesso restrito à própria conta |
| `app/frontapp/scripts` | Verificação visual automatizada |
| `app/app-backend/projeto pokedex/src` | API NestJS, DTOs, autenticação e regras de negócio |
| `app/app-backend/projeto pokedex/prisma` | Schema, migrations e client gerado |
| `app/app-backend/projeto pokedex/test` | Testes HTTP de autenticação, sem acesso a banco |
| `app/app-backend/projeto pokedex/scripts` | Testes de integração/persistência e PokéAPI real |
| `docs/validacao` | Screenshots, resultados e evidências de preservação |

Frontend: Next.js 16.3.4, React/React DOM 19.2.8, TypeScript, hooks React, fetch, CSS global e Bootstrap 5.3.8/Bootstrap Icons via CDN. Geist é configurada por next/font; a interface utiliza uma pilha sans-serif. Não há Redux, React Query ou serviço de upload. O backend acrescentou somente Nodemailer para SMTP e suas tipagens de desenvolvimento; remetente e credenciais ficam em variáveis de ambiente.

Backend: NestJS 11, JWT 12, Prisma 7 com adaptador better-sqlite3, SQLite, bcryptjs, class-validator/class-transformer, Axios, Jest, ts-jest e Supertest. O package.json declara Node >=24.9.0; ambiente verificado: Node 24.22.1. Os testes Jest usam módulos VM por causa das dependências ESM.

Há dois repositórios Git. Não há monorepo/workspace de pacotes na raiz. O package-lock.json é o lockfile existente; node_modules foi preparado durante a implementação anterior com o pnpm do runtime. Uma instalação limpa com npm ci em outro computador ainda precisa de verificação específica.

## 3. Frontend e navegação

| Rota | Implementação |
|---|---|
| `/` | Home, hero, destaques reais, recursos, chamada de cadastro e rodapé |
| `/pokedex` | Catálogo Kanto: busca por nome/número, tipo, ordenação e paginação |
| `/pokedex/[id]` | Descrição, imagem, tipos, habilidades, medidas, seis estatísticas e evoluções |
| `/ranking` | Ranking público; abas XP, capturas e insígnias |
| `/login` e `/cadastro` | Formulários reais, validação, mostrar senha, confirmação e feedback |
| `/recuperar-senha` | Solicitação por e-mail, resposta genérica e feedback de indisponibilidade |
| `/redefinir-senha` | Link por fragmento, nova senha/confirmar, uso único e retorno ao login |
| `/register` | Redirecionamento de compatibilidade para cadastro |
| `/logout` | Encerra o cookie na API, limpa o estado local e retorna à Home; falha oferece nova tentativa |
| `/dashboard` | Métricas reais, XP, nível, equipe principal e insígnias recentes |
| `/meus-pokemon` | Coleção, filtros, ordenação, criar/consultar/editar/excluir captura |
| `/equipes` | Criar/editar/excluir; descrição, principal e seleção de até seis capturas |
| `/insignias` | Oito insígnias, metas, progresso e estados de conquista |
| `/progressao` | XP, nível, metas e gráfico de seis meses baseado nos registros atuais |
| `/perfil` | Dados pessoais, username, biografia e imagem por URL |
| `/admin` e `/admin/users` | Fluxo anterior mantido; não representa gestão global com papéis de administrador |

Componentes centrais: Header/Brand, Footer, PokemonCard/Types, Catalog, PokemonDetails, AuthForm, TrainerShell, TrainerMetrics, Modal, CaptureModal, Collection, TeamBuilder, Dashboard, Ranking, Badges, Progression e Profile.

`api.ts` centraliza fetch com credentials: include, mensagens e expiração/401; Bearer continua aceito para compatibilidade com sessões anteriores. `use-resource.ts` carrega recursos com estados de erro/loading e reconsulta. Layouts/páginas são Server Components onde possível; os componentes de interação usam Client Components. `params` de detalhes é uma Promise, conforme a versão local do Next.js.

As páginas privadas usam TrainerShell. Pokédex e ranking continuam com layout público mesmo quando abertos pelo menu do treinador; a sidebar não persiste nessas duas rotas públicas.

## 4. Backend e API

`main.ts`: prefixo `/api`, ValidationPipe com whitelist/forbidNonWhitelisted/transform e CORS para `FRONTEND_ORIGIN` (padrão http://localhost:3001), com credentials: true. `DatabaseModule` disponibiliza PrismaService. Auth, Users, Profiles, Pokemon, CapturedPokemon, Teams, Badges, Progression e Leaderboard estão conectados ao AppModule; Progression também é importado pelos módulos que o utilizam.

Todos os caminhos abaixo têm prefixo `/api`. Exceto os caminhos marcados públicos, exige-se JWT válido por cookie HttpOnly ou Bearer. Propriedade é validada nos recursos privados.

| Método | Caminho | Acesso e finalidade |
|---|---|---|
| POST | `/auth/login` | Público com validação de Origin; JWT e cookie; rememberMe opcional |
| POST | `/auth/register` | Público; usuário e perfil criados juntos; cookie de sessão |
| POST | `/auth/forgot-password` | Público, Origin e limites; 202 genérico; SMTP TLS configurável |
| POST | `/auth/reset-password` | Público, Origin e limites; token válido de uso único, atualiza hash e revoga sessões |
| GET | `/auth/session` | JWT; restaura identidade segura e data de expiração |
| POST | `/auth/logout` | Público com validação de Origin; expira cookie de sessão |
| GET | `/pokemon` | Público; lista registros locais |
| GET | `/pokemon?source=pokeapi` | Público; catálogo externo, search/type/sort/page |
| GET | `/pokemon/:identifier` | Público; detalhes reais e ID local quando sincronizado |
| POST | `/pokemon/sync/:identifier` | JWT; sincroniza uma espécie |
| POST | `/pokemon/sync` | JWT; fluxo anterior de sincronização de 1 a 150 |
| POST | `/users` | JWT; cria conta, sem retornar hash |
| GET | `/users` | JWT; retorna somente a própria conta |
| PUT / DELETE | `/users/:id` | JWT; somente o próprio usuário |
| GET / PUT | `/profiles/me` | JWT; consulta/edita conta e perfil em transação |
| POST | `/profiles` | JWT; cria perfil vinculado ao usuário autenticado |
| GET / PUT | `/profiles/:id` | JWT; somente perfil do usuário |
| POST / GET | `/captured-pokemon` | JWT; cria captura/lista a própria coleção |
| GET / PATCH / DELETE | `/captured-pokemon/:id` | JWT; consulta/edita/exclui captura própria |
| POST / GET | `/teams` | JWT; cria/lista equipes próprias |
| GET / PATCH / DELETE | `/teams/:id` | JWT; consulta/edita/exclui equipe própria |
| POST | `/teams/:id/pokemon` | JWT; adiciona captura própria em posição de 1 a 6 |
| DELETE | `/teams/:id/pokemon/:pokemonId` | JWT; remove integrante pelo ID de captura |
| GET | `/badges` e `/badges/:id` | JWT global; catálogo de insígnias |
| GET | `/badges/progress` | JWT; progresso das oito metas |
| GET | `/badges/trainer/me` | JWT; insígnias conquistadas |
| POST | `/badges/:id/claim` | JWT; retorna 403, pois não há concessão manual |
| DELETE | `/badges/:id` | JWT; retorna 403, pois conquistas não são removidas manualmente |
| GET | `/progression/me` | JWT; nível, XP, métricas e distribuição mensal |
| GET | `/leaderboard` | Público; ranking real por XP |

Há API de recuperação e revogação das sessões anteriores quando a senha é redefinida. Não há refresh de JWT, upload de imagem ou batalhas. Alguns comentários antigos dos controllers ainda dizem “público” para badges; o guard global efetivamente exige JWT.

## 5. Banco e relações

| Modelo | Relações e dados principais |
|---|---|
| User | Conta, e-mail único, hash bcrypt, sessionVersion; perfil, capturas, equipes, conquistas e solicitações de recuperação |
| PasswordResetToken | Pertence a User; tokenHash SHA-256, expiresAt, usedAt e createdAt; nunca armazena token aberto |
| Profile | Um por User; username único opcional, nome, bio, avatar, região, nível e espécie favorita |
| Pokemon | Espécie local, nome e pokedexNumber únicos, tipos, medidas, sprite e áudio |
| CapturedPokemon | Pertence a User e Pokemon; apelido, nível, data, notas, local, favorito e atributos |
| Team | Pertence a User; nome, descrição e isActive |
| TeamPokemon | Relaciona Team e CapturedPokemon; posição única e captura única na equipe |
| Badge | Identidade única por região/número |
| TrainerBadge | Conquista única por User/Badge, com obtainedAt |

IDs não são intercambiáveis: pokedexNumber corresponde à PokéAPI; Pokemon.id é chave local; CapturedPokemon.id identifica a captura; integrantes de equipe referenciam capturas. A interface sincroniza a espécie antes de registrar nova captura.

Migrations: três históricas de usuário/perfil/senha e `20261104160000_complete_pokedex_schema`, aditiva, aplicada na implementação anterior. Na etapa de recuperação foi acrescentada 20261104190000_password_reset: nova coluna sessionVersion com padrão zero e nova tabela de tokens. Foi aplicada com migrate deploy após backup e testes, sem alterar dados anteriores. O histórico contém um hash padrão de senha, que permanece como dívida técnica a ser revisada sem apagar dados.

Limite seis, propriedade dos integrantes e equipe principal são controlados pelo service em transações. As constraints de posição/captura evitam duplicidades. O schema não tem uma constraint própria de “no máximo seis” nem de “uma equipe ativa”; gravações externas à API devem respeitar as mesmas invariantes.

## 6. PokéAPI preservada

`PokeApiService` continua sendo a integração externa, via Axios em https://pokeapi.co/api/v2. O serviço foi ampliado na fase anterior, sem criar um segundo cliente paralelo.

- Pokémon: nome, número, tipos, imagens, medidas, habilidades, stats e áudio.
- pokemon-species: descrição (português quando disponível, senão inglês) e indicação de lendário nos detalhes.
- evolution-chain: evoluções; a apresentação atual é uma sequência achatada, não um diagrama das ramificações.
- type: filtragem de espécies no catálogo.
- Catálogo: 151 espécies de Kanto, doze itens por página, busca por nome/número, nome A–Z e número crescente/decrescente.
- Cache em memória: cinco minutos, no máximo 512 entradas; não é cache distribuído/persistente.
- Timeout externo de 15 segundos. 404 é distinguido de indisponibilidade, que retorna 503.

Somente a sincronização grava a espécie local. O catálogo/detalhes não duplicam o dataset completo no banco. Capturas/equipes armazenam dados do treinador no backend próprio. A sincronização em lote histórica continua limitada a 150; Mew pode ser sincronizado individualmente. A espécie local guarda um subconjunto dos dados, enquanto detalhes completos vêm da PokéAPI.

Os dados de espécies usados na revisão visual foram obtidos na PokéAPI real. A suíte de integração de banco tem uma fixture artificial explicitamente restrita ao banco de teste; não é consumida pela aplicação. O teste de erro do catálogo aborta uma requisição deliberadamente; isso é injeção de falha, não substituição permanente de dados.

## 7. Autenticação e autorização

Senhas recebidas são convertidas em hash bcrypt. Registro aceita password e mantém compatibilidade com o nome legado passwordHash; esse valor recebido nunca é tratado como hash confiável. Login compara bcrypt. JWT contém sub e expira em um dia; o guard valida assinatura/expiração e normaliza sub para user.id.

Rotas públicas são declaradas por metadados, sem exceções por substring da URL. Recursos do usuário verificam propriedade. Cadastro cria perfil junto à conta. Dados de conta/perfil, formação completa e alterações de captura/progressão utilizam transações.

Novos logins usam cookie `pokedex_session`, HttpOnly, SameSite=Lax e Path=/api. O cookie é de sessão por padrão e persistente por um dia com rememberMe. Secure é habilitado em NODE_ENV=production; publicação exige HTTPS. Mutações autenticadas por cookie validam Origin contra FRONTEND_ORIGIN; login/cadastro/logout também verificam Origin quando informado. CORS permite credenciais somente nas origens configuradas.

O frontend guarda apenas o horário de expiração, sem JWT, em sessionStorage/localStorage, e restaura a sessão pela API se o marcador estiver ausente. Bearer legado continua funcionando; novos logins não o persistem no armazenamento JavaScript. Logout confirma a expiração do cookie na API antes de limpar o estado local e redirecionar. A autorização efetiva e a propriedade dos recursos permanecem no backend.

**Sessões após recuperação:** o JWT inclui sessionVersion. O guard consulta a versão atual no banco; redefinir senha incrementa a versão e invalida cookies/Bearers anteriores, inclusive em outros navegadores. JWTs legados sem versão são tratados como versão zero, preservando compatibilidade até a primeira redefinição. Contas excluídas também são rejeitadas. O logout comum remove o cookie do navegador; ainda não há refresh token ou revogação global em cada logout. O contrato legado continua retornando access_token. Não há papéis de administrador. HTTPS, proxy e configuração de produção não foram exercitados nesta rodada local.

## 8. XP, nível e insígnias

XP = 10 × capturas atuais + 50 × insígnias conquistadas. Nível = floor(XP/100)+1. Cada nível requer 100 XP. Excluir captura reduz a parcela de XP dessa captura; insígnias conquistadas permanecem. O gráfico mensal usa datas das capturas ainda existentes e obtainedAt das insígnias, em UTC, nos seis meses atuais. Não representa capturas excluídas nem um histórico imutável de eventos.

O usuário autorizou substituir objetivos de batalhas por metas automáticas de capturas, coleção e nível. Regras em badge-rules.ts:

| Insígnia | Objetivo |
|---|---|
| Pedra | Cinco capturas |
| Cascata | Três espécies distintas de Água |
| Trovão | Duas espécies distintas de Elétrico |
| Arco-íris | Três espécies distintas de Planta |
| Alma | Cinquenta capturas |
| Pântano | Nível 30 |
| Vulcão | Três espécies distintas de Fogo |
| Terra | As 151 espécies de Kanto |

O catálogo de oito insígnias é garantido por upserts na inicialização. Avaliação ocorre nas operações de criação/exclusão de captura, dentro da transação; duas passagens permitem considerar XP de novas insígnias. Não há CRUD manual de XP ou conquistas. “Conquistas recentes” do dashboard são insígnias; conquistas independentes ainda não têm modelo/fluxo próprio.

## 9. Validação visual por tela

Viewport desktop: 1440×1000. Viewport móvel: 390×844. Foram inspecionadas imagens realmente renderizadas, além de assertions de fluxo e overflow. Não se trata de comparação pixel a pixel: os protótipos têm dados e dimensões ilustrativos diferentes.

| Tela | Resultado e correspondência | Evidência |
|---|---|---|
| 01 Home | Hero vermelho, ilustração real, hierarquia, CTAs e cards; tipografia/links já corrigidos na rodada visual anterior, preservados | [desktop](finalizacao/01-home.png) / [móvel](finalizacao/mobile-01-home.png) |
| 02 Recursos | Quatro recursos, CTA e rodapé; fundo e links alinhados à identidade; conteúdo integral também visto na Home móvel | [desktop](finalizacao/02-home-recursos.png) / [móvel](finalizacao/mobile-02-home-recursos.png) |
| 03 Catálogo | Grade quatro/duas colunas, filtros, paginação, loading/erro/vazio; dados Kanto reais | [desktop](finalizacao/03-catalogo.png) / [móvel](finalizacao/mobile-03-catalogo.png) |
| 04 Detalhes | Composição imagem/ficha, medidas, habilidades, stats e evoluções; colunas empilhadas no celular | [desktop](finalizacao/04-detalhes.png) / [móvel](finalizacao/mobile-04-detalhes.png) |
| 05 Ranking | Pódio e tabela; abas funcionais; tabela tem rolagem horizontal própria no celular | [desktop](finalizacao/05-ranking.png) / [móvel](finalizacao/mobile-05-ranking.png) |
| 06 Login | Painel vermelho e Pikachu restaurado; formulário, lembrar usuário e mostrar senha; cookie HttpOnly e link de recuperação integrados; SMTP TLS local testado, entrega Gmail ainda não verificada | [desktop](finalizacao/06-login.png) / [móvel](finalizacao/mobile-06-login.png) |
| 07 Cadastro | Painel vermelho/Eevee, confirmação e feedback; ilustração aguardada antes da captura final | [desktop](finalizacao/07-cadastro.png) / [móvel](finalizacao/mobile-07-cadastro.png) |
| 08 Dashboard | Sidebar, banner XP, quatro métricas, equipe principal e insígnias recentes; cards em duas colunas móveis | [desktop](finalizacao/08-dashboard.png) / [móvel](finalizacao/mobile-08-dashboard.png) |
| 09 Coleção | Cards com espécie/nível/data e ações; consulta da captura agora mostra seus dados próprios; CRUD completo testado; grade três/uma coluna | [desktop](finalizacao/09-colecao.png) / [móvel](finalizacao/mobile-09-colecao.png) |
| 10 Captura | Dialog nativo, backdrop, campos, criação/edição e Escape; campos empilhados no celular | [desktop](finalizacao/10-nova-captura.png) / [móvel](finalizacao/mobile-10-nova-captura.png) |
| 11 Equipes | Principal, descrição, seis integrantes e resumo; reflow móvel. Nível médio substitui “força” sem inventar fórmula de combate | [desktop](finalizacao/11-equipes.png) / [móvel](finalizacao/mobile-11-equipes.png) |
| 12 Editar equipe | Nome/descrição e seleção da coleção; sétimo integrante desabilitado; edição/remoção de integrante persistidas; modal longo permite rolagem | [desktop](finalizacao/12-editar-equipe.png) / [móvel](finalizacao/mobile-12-editar-equipe.png) |
| 13 Insígnias | Oito cards quatro/duas colunas, meta/progresso, conquistada/bloqueada; objetivos ajustados com autorização | [desktop](finalizacao/13-insignias.png) / [móvel](finalizacao/mobile-13-insignias.png) |
| 14 Progressão | Nível, XP, gráfico e metas reais; cards e gráfico adaptados. Histórico limitado à coleção atual, informado na tela | [desktop](finalizacao/14-progressao.png) / [móvel](finalizacao/mobile-14-progressao.png) |
| 15 Perfil | Cartão, campos e métricas; biografia persistida após recarregar; nome acessível de textarea corrigido | [desktop](finalizacao/15-perfil.png) / [móvel](finalizacao/mobile-15-perfil.png) |

Diferenças remanescentes: ícones simplificados; sprites das capturas menores que as ilustrações do PDF; avatar por URL/inicial em vez de upload; entrega de recuperação pelo Gmail ainda não verificada; equipe mostra nível médio e diversidade de tipos, sem fórmula de força/efetividade de combate definida no documento. Avatar por URL atende a edição de imagem; upload não é explicitado como operação obrigatória no texto do PDF. Não foram inventados números de ranking, histórico de XP ou conquistas para reproduzir os exemplos visuais.

## 10. Testes e evidências

Resultados consolidados em [visual-results.json](finalizacao/visual-results.json) e [test-results.json](finalizacao/test-results.json):

| Check final | Resultado |
|---|---|
| Build frontend / backend | Ambos aprovados |
| Unitários | 17/17 aprovados: 15 do guard e dois dos limites de recuperação |
| Recuperação API + SMTP TLS local | Aprovada: entrega local, hash, expiração, uso único, concorrência, revogação, limites e erro SMTP |
| Recuperação no navegador | Aprovada: solicitação, confirmação, troca, login novo e rejeição de reutilização; desktop/celular |
| E2e HTTP sem banco | 4/4 aprovados |
| Integração de persistência/autorização | Aprovada; CRUD completo, isolamento, unicidade de perfil, limite seis e IDs inválidos |
| Oito regras de insígnias | Aprovadas; espécies distintas, nível 29→30, idempotência e permanência das conquistas |
| PokéAPI real e sincronização | Aprovadas no banco isolado |
| Playwright desktop/celular | 35 screenshots; sem pageerror nem overflow horizontal da página |
| Preservação dev.db | Todos os campos/registros anteriores idênticos; nova coluna/tabela/migration esperadas; foreign_key_check OK |
| Lint frontend completo | Zero erros, 12 avisos (11 img e um redirecionamento) |
| Lint backend/test | Rodada anterior: zero erros, quatro avisos; arquivo não modificado nesta rodada |
| Lint backend/src | 540 erros e um aviso remanescentes; não aprovado |

 Comandos executados com os binários Node do runtime, equivalentes aos scripts abaixo:

- Frontend: npm run build; ESLint de app e do projeto completo; Playwright scripts/verify-visual.cjs --isolated-db.
- Backend: npm run build; npm test -- --runInBand --no-cache; npm run test:e2e -- --runInBand --no-cache.
- Persistência/autorização: DATABASE_URL restrito a .verification/test.db e node scripts/verify-integration.cjs.
- PokéAPI real: o mesmo banco isolado e node scripts/verify-pokeapi.cjs.
- Preservação: comparação de contagens e hashes de todas as tabelas do dev.db antes/depois; foreign_key_check somente de leitura.

O e2e antigo esperava Hello World em uma rota inexistente. Foi substituído por quatro testes HTTP relevantes de rota pública, proteção de query, JWT válido e expirado, sem acessar banco. Os cenários anteriores do guard foram preservados. A suíte atual reúne quinze casos do guard, incluindo sessão revogada/conta excluída, e dois casos dos limites de recuperação, totalizando dezessete aprovados. A fixture de espécie do script de integração agora usa número único por execução para permitir repetir o teste sem apagar registros.

O lint do backend/src tinha 693 erros e dois avisos na rodada anterior. A formatação dos arquivos tocados e a correção da Promise de bootstrap reduziram o total para 540 erros e um aviso. Não há novas ocorrências nos arquivos de produção alterados; o passivo geral impede declarar o lint backend aprovado. Resultados completos em finalizacao/backend-lint.json. O frontend mantém zero erros e doze avisos (imagens e redirecionamento preexistentes).

O Playwright exerceu cadastro com confirmação inválida/válida, captura/consulta/edição/exclusão, equipe com seis, edição e retirada de integrante, exclusão da equipe, perfil persistido após reload, insígnia concedida, ranking, login inválido/válido, lembrar de mim, restauração sem marcador local, logout e bloqueio de rota privada. O token não foi armazenado em localStorage/sessionStorage nos novos logins; HttpOnly, SameSite e persistência do cookie foram inspecionados. As capturas/equipes foram novamente consultadas após recarregar, confirmando integração e persistência.

A suíte de integração usa fixtures artificiais exclusivas do banco descartável para testar limiares das oito insígnias, sem consultar centenas de espécies externas. As espécies usadas nos fluxos visuais continuam sincronizadas da PokéAPI real. A verificação externa adicional cobre busca, tipo, ordenação numérica decrescente, A–Z e segunda página. Esses controles também foram exercitados no navegador, assim como a busca e seleção de espécie no modal de captura. Nenhum desses dados de teste foi gravado no dev.db original.

## 11. Execução local e reprodução

Backend, dentro de app/app-backend/projeto pokedex: configurar DATABASE_URL e JWT_SECRET no ambiente; npm ci; npx prisma generate; npm run build; npm run start:prod. Não executar migrate/reset automaticamente em banco existente. A migration aditiva da fase anterior já está aplicada no dev.db desta cópia.

Frontend, dentro de app/frontapp: npm ci; npm run build; npm run start -- -p 3001. O script dev usa 3001; start sem argumento usa o padrão Next e pode colidir com backend em 3000. NEXT_PUBLIC_API_URL deve ser configurado antes do build para outra origem; padrão http://localhost:3000/api.

Playwright: usar pacote playwright disponível localmente (ou PLAYWRIGHT_MODULE apontando para o módulo instalado), Chrome instalado e URLs explícitas VISUAL_BASE_URL/VISUAL_API_URL. O script atual tem fallback para o módulo do runtime desta máquina. Iniciar backend em banco novo dentro de .verification, aplicar nele os SQLs existentes e confirmar --isolated-db. Não executar os fluxos que criam/alteram dados contra o banco do usuário. Screenshots contêm apenas contas fictícias de teste.

Na sandbox, Chromium iniciou, porém imagens externas e CSS CDN foram bloqueados. A execução aprovada fora da restrição de rede carregou recursos reais. Os servidores anteriores em 3000/3001 foram confirmados por HTTP 200 e netstat, encerrados pelas suas próprias sessões e substituídos por processos de validação. Não foi acessado o perfil Chrome pessoal nem lida sua barra de endereços.

## 12. Pendências e limites do escopo original

1. **Entrega real pelo Gmail: não verificada.** O usuário definiu Gmail SMTP e SMTP_FROM por ambiente. API, frontend, entrega via Nodemailer e regras de segurança estão implementados e passaram com SMTP TLS local. Faltam configurar SMTP_USER, SMTP_PASS e SMTP_FROM da conta do projeto e verificar a entrega real. Nenhuma credencial foi solicitada pelo chat, gravada no código ou inventada. Não declarar entrega Gmail concluída antes desse teste.
2. **Lint backend: não aprovado**, com 540 erros e um aviso remanescentes. São dívidas já existentes; não foi feita reformatação abrangente de módulos que não precisaram de correção funcional.
3. **Validação não exaustiva:** Chrome desktop/celular foi exercitado. Outros motores, leitor de tela, contraste completo, concorrência, instalação limpa e implantação HTTPS continuam sem verificação específica.
4. O layout público da Pokédex/ranking não mantém a sidebar ao vir da área privada; navegação continua acessível pelo painel. Ícones/ilustrações têm diferenças cosméticas. O resumo de equipe usa nível médio e número de tipos; o PDF não define cálculo de força de combate. Não foi inventada uma fórmula.
5. O gráfico de XP é calculado sobre capturas existentes e insígnias, com essa limitação indicada na tela. Não foi acrescentado histórico imutável, sistema novo de conquistas, batalha ou upload de arquivos. São extensões de escopo, não substitutos para os CRUDs previstos.
6. Persistem características técnicas descritas nas seções 5–7: hash padrão no schema legado, logout comum sem revogação global, cache em memória e dependências de imagens/CSS externas. Essas características não foram expandidas além do necessário à recuperação.

Os onze fluxos principais e a recuperação com SMTP local passaram. Isso não transforma o envio Gmail não verificado ou a implantação de produção em verificações concluídas.

## 13. Correções e arquivos alterados nesta rodada funcional

- Backend: src/auth/auth.controller.ts e novo src/auth/session-cookie.ts implementam transporte HttpOnly e consulta/logout de sessão; src/auth/jwt-auth.guard.ts mantém Bearer e valida cookie/Origin; src/auth/authenticated-request.ts tipa exp; src/dtos/login-dto.ts aceita rememberMe; src/main.ts habilita credenciais CORS e explicita a chamada assíncrona de bootstrap.
- Backend: src/teams/teams.service.ts corrige PATCH /teams/0 que criava registro por tratar zero como ausência de ID. src/teams/teams.controller.ts, src/captured-pokemon/captured-pokemon.controller.ts e src/badges/badges.controller.ts validam parâmetros numéricos com ParseIntPipe, retornando 400 para IDs malformados.
- Frontend: app/login/auth_service.ts, app/lib/api.ts, app/components/AuthForm.tsx, Header.tsx, TrainerShell.tsx, app/logout/page.tsx e app/admin/users/page.tsx integram o cookie, restauração e logout confirmado pela API, preservando contratos e rotas.
- Frontend: app/components/Collection.tsx implementa consulta dos dados da captura em modal próprio; o botão antes abria apenas a ficha de espécie. CaptureModal.tsx explicita loading/erro e nova tentativa na consulta de espécies, além de impedir fechamento durante salvamento.
- Verificação: backend/src/auth/jwt-auth.guard.spec.ts, scripts/verify-integration.cjs, scripts/verify-pokeapi.cjs e frontend/scripts/verify-visual.cjs ampliam a cobertura descrita na seção 10. A exceção CommonJS do script visual já existia; nenhuma regra do aplicativo foi desabilitada.
- Documentação/evidências: docs/ANALISE_PROJETO.md e docs/finalizacao/. A rodada visual anterior foi preservada em docs/validacao/.

A etapa funcional anterior não alterou schema/dependências; a etapa de recuperação acrescentou Nodemailer/tipagens e a migration aditiva descrita na seção 14. Sem reset, commits ou publicação. A comparação dos campos e registros anteriores permaneceu idêntica; foreign_key_check sem violações. Os testes de escrita usaram exclusivamente .verification/test.db. Os servidores temporários foram encerrados após a verificação.

## 14. Recuperação de senha — Gmail SMTP

Implementada após a definição do provedor pelo usuário. Fluxo: Esqueci minha senha → /recuperar-senha → POST /api/auth/forgot-password → e-mail → /redefinir-senha#token=... → POST /api/auth/reset-password → entrar com a nova senha. A aplicação não autentica automaticamente após a redefinição.

O token tem 32 bytes aleatórios criptográficos, é enviado somente no e-mail e armazenado como SHA-256. Expira em quinze minutos; uma solicitação nova substitui a anterior. A atualização do token, senha bcrypt (custo 12) e versão de sessão é transacional; somente uma tentativa concorrente pode consumir o link. Novas senhas exigem 8–72 caracteres e no máximo 72 bytes UTF-8. O frontend retira o fragmento da barra de URL após lê-lo, mantendo o token somente na memória do formulário. Recarregar a página sem reabrir o link exige uma nova solicitação.

Resposta 202 idêntica para conta existente/inexistente, sem token na resposta. A entrega ocorre sem aguardar SMTP na resposta HTTP; erros de envio geram aviso genérico sem endereço, token ou credenciais e invalidam o token correspondente. Configuração ausente/inválida gera indisponibilidade, sem impedir login/catálogo. Limites por processo: cinco solicitações por IP/15 min, uma por e-mail/minuto e dez tentativas de redefinição por IP/15 min; armazenamento limitado a 10 mil entradas, com limpeza por expiração. Não há fila durável, limitador distribuído ou configuração de proxy confiável; múltiplas instâncias exigem avaliação própria.

Configuração no backend: copiar os campos necessários de [.env.example](../app/app-backend/projeto%20pokedex/.env.example) para o ambiente local existente, preservando DATABASE_URL e JWT_SECRET. Preencher SMTP_USER, SMTP_PASS e SMTP_FROM localmente. SMTP_HOST=smtp.gmail.com; usar SMTP_PORT=465 e SMTP_SECURE=true, ou 587/false com STARTTLS obrigatório. Certificado é validado, TLS mínimo 1.2. PASSWORD_RESET_URL define a URL fixa da interface; em produção deve ser HTTPS. Nenhum endereço real ou credencial foi escrito no repositório; o .env existente não foi alterado.

A configuração com senha de app depende de disponibilidade na conta/política do Google e verificação em duas etapas: [orientação oficial Google](https://support.google.com/accounts/answer/185833/sign-in-with-app-passwords). Portas Gmail: [documentação oficial](https://developers.google.com/workspace/gmail/imap/imap-smtp?hl=en). Transporte TLS: [Nodemailer SMTP](https://nodemailer.com/smtp). Se a conta não permitir senhas de app, será necessário configurar um método de autenticação permitido pela organização; OAuth não foi implementado nesta rodada.

Arquivos acrescentados: backend/src/auth/password-reset.service.ts, reset-mail.service.ts, reset-password.dto.ts, reset-rate-limit.service.ts, reset-rate-limit.service.spec.ts, session-version.service.ts e session-version.token.ts; prisma/migrations/20261104190000_password_reset/migration.sql; backend/.env.example; scripts/verify-recovery.cjs; frontend/app/components/PasswordRecoveryForm.tsx e páginas recuperar-senha/redefinir-senha. Arquivos existentes adaptados: AuthForm.tsx, verify-visual.cjs (diretório de saída configurável), auth controller/module/service/guard/tipos/testes, e2e, schema.prisma, package.json e package-lock.json. O lockfile recebeu apenas os dois pacotes novos, mantendo as entradas anteriores.

A migration foi testada primeiro em .verification/test.db. Esse banco havia sido montado por SQL na etapa anterior, sem registrar a migration completa; o deploy apontou tabela já existente. Foi corrigido exclusivamente o histórico desse banco descartável com migrate resolve --applied para a migration já presente, seguido do deploy novo. No dev.db original, migrate deploy aplicou apenas a nova migration normalmente. Não houve reset nem resolução artificial do histórico original. Backup SQLite foi criado antes; os snapshots de [antes](recuperacao/database-before.json) e [depois](recuperacao/database-after.json) comparam os mesmos campos anteriores, excluindo somente o novo registro esperado de migration. Todas as contagens e hashes anteriores coincidiram; sessionVersion zero para usuários existentes, tabela nova vazia e chaves estrangeiras íntegras.

Verificações atuais em [recuperacao](recuperacao/): 17 unitários, quatro E2e HTTP, integração de banco/insígnias, PokéAPI real e 35 screenshots da regressão dos quinze protótipos. A recuperação acrescentou quatro screenshots desktop/celular e testou SMTP TLS local com certificado de teste confiável, expiração, token incorreto/usado, senha curta/UTF-8 acima do limite, concorrência, login antigo recusado, login novo válido, JWT anterior recusado, limites, erro SMTP e configuração ausente. Nenhuma mensagem foi enviada para endereços reais. As credenciais/endereço dos scripts são fixtures de domínio example.test, exclusivamente locais.

Builds frontend/backend aprovados. Lint frontend: zero erros e doze avisos; código de autenticação tocado: zero erros; backend geral ainda tem 540 erros e um aviso anteriores, reduzidos pela formatação dos arquivos alterados. Não foi executado npm ci limpo nesta rodada; os comandos usaram o ambiente já instalado. O gerenciador informou política de scripts nativos ignorados; o binário SQLite existente permaneceu operacional e os testes de banco passaram.
