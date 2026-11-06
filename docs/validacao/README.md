# Evidências de validação — 04/11/2026

- [Relatório técnico](../ANALISE_PROJETO.md).
- [Resultados técnicos](test-results.json), [Playwright](visual-results.json), [lint](lint-summary.json).
- [Preservação antes](database-before.json) e [depois](database-after.json): apenas contagens e hashes, sem dados pessoais.
- [Desktop: telas 01–05](contato-desktop-1.png), [06–10](contato-desktop-2.png), [11–15](contato-desktop-3.png).
- [Celular: composição final](contato-mobile-final.png). As imagens individuais mobile-*.png cobrem as quinze telas, incluindo os dois modais e recursos da Home.
- [Estado de erro](estado-catalogo-erro.png), [carregamento](estado-catalogo-carregando.png), [catálogo vazio](estado-catalogo-vazio.png), [dashboard sem capturas](estado-dashboard-vazio.png).

Playwright/Chrome headless acessou localhost explicitamente, sem ler a barra de endereços. Os screenshots finais de tela são os arquivos 01-*.png a 15-*.png e mobile-*.png. Contêm somente dados de contas fictícias em banco isolado. baseline-home.png e failure.png são registros intermediários de diagnóstico, não evidências do estado final. Os contatos mobile-1/2/3 também são intermediários; contato-mobile-final.png registra as correções finais.

O cenário de erro aborta deliberadamente uma requisição e o de loading atrasa uma requisição antes de continuar com dados reais. A suíte não injeta respostas Pokémon fictícias.

A verificação de overflow compara scrollWidth da página com o viewport; a tabela de ranking tem rolagem horizontal própria. Em modais longos, a rolagem vertical é esperada. Não foi executada auditoria completa de contraste/leitor de tela nem comparação pixel a pixel.

A suíte visual é app/frontapp/scripts/verify-visual.cjs. Exige --isolated-db como confirmação operacional de que o servidor está apontado para o banco descartável. Essa flag não detecta o banco do servidor: o responsável deve configurar e conferir DATABASE_URL antes de executá-la.
