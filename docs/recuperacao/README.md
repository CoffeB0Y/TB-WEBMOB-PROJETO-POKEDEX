# Recuperação de senha — evidências

- [Relatório e configuração Gmail](../ANALISE_PROJETO.md#14-recuperação-de-senha--gmail-smtp).
- [Resultados da recuperação](recovery-results.json): SMTP local TLS e navegador.
- [Regressão dos quinze protótipos](fluxos/visual-results.json): 35 screenshots e os onze fluxos principais.
- [Solicitação desktop](solicitacao-desktop.png), [celular](solicitacao-mobile.png), [redefinição desktop](redefinicao-desktop.png) e [celular](redefinicao-mobile.png).
- [Banco antes](database-before.json) e [depois](database-after.json): campos e registros anteriores preservados, nova coluna/tabela/migration esperadas.
- Lint e testes consolidados em test-results.json, frontend-lint.json, backend-lint.json e auth-lint.json.

SMTP real do Gmail ainda não foi validado: SMTP_USER, SMTP_PASS e SMTP_FROM não estão configurados no ambiente. O .env existente permaneceu intacto; o modelo não contém credenciais nem endereço real. O teste usa somente servidor SMTP TLS local, contas example.test e banco descartável. O certificado de teste nunca é usado pelo código de produção.

Reprodução: gerar certificado local de teste em .verification/smtp-key.pem e smtp-cert.pem; configurar NODE_EXTRA_CA_CERTS para esse certificado apenas no processo de teste; DATABASE_URL=file:./.verification/test.db e JWT_SECRET de teste; executar node scripts/verify-recovery.cjs. Para --browser, iniciar o frontend em 3001 e manter 3000 livre (o teste inicia sua própria API). Para a regressão geral, iniciar a API descartável e usar VISUAL_OUTPUT_DIR para escolher a pasta de evidências. Não usar essas suítes de escrita no dev.db do usuário.
