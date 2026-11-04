# WXRLD.IA — Controle financeiro pessoal

Aplicativo PWA de controle financeiro pessoal, em português e com valores em reais. Atualização 1.1.

## O que já funciona
- Registro de despesas e receitas por texto com interpretação local de valor, tipo, data simples e categoria sugerida.
- Revisão dos campos antes de salvar.
- Entrada por voz com reconhecimento do navegador quando disponível; no iPhone, usa o ditado nativo do teclado como caminho preferencial, pois o reconhecimento web pode ficar sem resposta em algumas versões do Safari. Inclui limite de tempo e recuperação para evitar o estado infinito “Ouvindo...”.
- Dashboard com saldo estimado, receitas, despesas, gastos de hoje e movimentações recentes.
- Histórico com busca e filtros; edição e exclusão.
- Relatórios mensais por categoria e visão dos últimos sete dias.
- Categorias personalizadas e saldo inicial.
- Backup/restore JSON e exportação CSV.
- Armazenamento local via IndexedDB e cache offline básico.
- Alternância entre tema claro e escuro, com preferência salva no aparelho.

## Atualizar uma instalação existente
1. Substitua no repositório os arquivos `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `sw.js` e `README.md` pelos arquivos desta versão.
2. Faça commit das alterações na branch `main`.
3. Aguarde a publicação do GitHub Pages. Abra o site no Safari e atualize a página.
4. Feche completamente o aplicativo da tela inicial e abra-o novamente para carregar a versão nova.

A atualização preserva o banco IndexedDB e as preferências locais existentes; não apague os dados do site nem restaure um backup se não for necessário.

## Instalação no iPhone
1. Publique esta pasta em um endereço HTTPS (por exemplo, GitHub Pages).
2. Abra o endereço no Safari do iPhone.
3. Toque em Compartilhar → Adicionar à Tela de Início.
4. Ative “Abrir como App da Web”, se aparecer, e toque em Adicionar.

## Publicação gratuita pelo GitHub Pages
1. Crie uma conta gratuita no GitHub e um repositório público chamado `wxrld-ia`.
2. Envie todos os arquivos desta pasta para a raiz do repositório.
3. No repositório, abra Settings → Pages.
4. Em Build and deployment, escolha Deploy from a branch; selecione `main` e `/ (root)`; salve.
5. Aguarde o endereço `https://SEU-USUARIO.github.io/wxrld-ia/` ficar disponível.
6. Abra esse endereço no Safari do iPhone e siga as instruções acima.

## Privacidade e limitações desta versão
- Os registros ficam neste aparelho/navegador. Não há conta, servidor, sincronização entre dispositivos nem integração bancária.
- Exporte o backup JSON periodicamente e guarde-o em local seguro.
- No iPhone, o botão “Ditar” abre o campo de texto para usar o microfone nativo do teclado: toque no microfone do teclado, fale, toque em “Concluído” e depois em “Interpretar”. Para habilitar esse recurso, ative Ajustes → Geral → Teclado → Ativar Ditado. O reconhecimento Web Speech do Safari pode apresentar comportamento inconsistente em algumas versões.
- O interpretador é local e baseado em regras; ele não é um modelo de IA generativa. A classificação é uma sugestão que pode ser corrigida antes de salvar.
- A versão usa uma fonte externa do Google Fonts quando há internet; o layout e as funções principais não dependem dela.


## Versão 1.2 — identidade visual
- Paleta completa verde-floresta e bege champanhe em todas as telas.
- Tema claro em tons de marfim e verde; tema escuro em verde profundo com detalhes champanhe.
- Ícone atualizado com o monograma W e a montanha em bege champanhe.
- Seletor lunar de tema mantido, com a nova paleta.
- Banco de dados e registros financeiros preservados; atualização apenas visual.
