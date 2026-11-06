# Pokédex — API

NestJS, Prisma e SQLite, preservando integração real com a PokéAPI. Requer Node.js >=24.9.0.

## Executar

Instale com `npm install`. Use `.env.example` como referência, preenchendo as variáveis no ambiente local. Preserve um `.env` já existente; não copie o modelo por cima das credenciais. Configure JWT_SECRET com um segredo próprio e mantenha DATABASE_URL apontando para o banco correto. Para evitar ambiguidade de caminhos relativos entre Prisma e o processo Node, prefira URL absoluta, por exemplo `file:C:/caminho/do/projeto/dev.db`.

```sh
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

Faça backup antes de aplicar migrations em um banco com dados. Não use `migrate reset` ou `db push --force-reset`. A migration de correção acrescenta somente o vínculo opcional de criador da conta e seu índice.

API: http://localhost:3000/api. Interface: http://localhost:3001. `FRONTEND_ORIGIN` deve incluir exatamente a origem da interface. Para produção local: `npm run build` seguido de `npm run start:prod`. Publicação exige HTTPS e configuração própria do ambiente.

## Verificar

```sh
npm test -- --runInBand
npm run test:e2e -- --runInBand
npx tsc --noEmit
npx eslint "{src,apps,libs,test}/**/*.ts"
npm run build
node scripts/verify-audit-fixes.cjs --live
```

O último comando cria seu próprio banco descartável e executa regressões HTTP. `--live` acrescenta consultas reais à PokéAPI; precisa de HTTPS de saída. Sem a opção, não depende de dados externos. As fixtures não são utilizadas pela aplicação. As outras suítes existentes têm guardas de caminho para `.verification/test.db`; não direcionar testes de escrita ao banco original. O script `lint` legado usa `--fix`; o comando acima faz somente checagem.

## Segurança e contratos

- Cadastro, criação legada, login e redefinição rejeitam senhas acima de 72 bytes UTF-8. Hashes bcrypt existentes não são alterados. Uma senha antiga maior que o limite deve ser redefinida: os bytes descartados pelo bcrypt não podem ser recuperados do hash.
- E-mail é normalizado para minúsculas. Conflitos de unicidade retornam 409. Datas impossíveis e null em campos não anuláveis retornam 400.
- Datas sem horário são armazenadas ao meio-dia UTC para preservar o dia civil na interface; timestamps explícitos mantêm o instante informado.
- Nome da conta, nome completo e nome do treinador são atualizados juntos em transação.
- GET /users retorna a própria conta e as contas criadas pelo usuário autenticado, com campos públicos limitados. PUT/DELETE permanecem restritos à própria conta. O cliente não pode atribuir createdById.
- Equipes aceitam até seis capturas próprias e diferentes; a equipe principal é definida em transação.

## Recuperação de senha

Preencha SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM e PASSWORD_RESET_URL conforme o modelo. Há suporte a TLS na porta 465 ou STARTTLS obrigatório na 587. Não desative a validação do certificado. As credenciais Gmail reais não estão configuradas nem foram inventadas pela correção. A recuperação foi validada com SMTP TLS local, incluindo uso único, expiração e revogação de sessões; entrega real Gmail continua pendente.

Resultados, arquivos alterados e critérios de entrega: [auditoria atualizada](../../../docs/AUDITORIA_CRUD_2026-11-05.md).
