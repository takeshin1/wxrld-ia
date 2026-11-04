# WXRLD.IA — UORDI

Primeira versão PWA de controle financeiro pessoal, em português e com valores em reais.

## O que já funciona
- Registro de despesas e receitas por texto com interpretação local de valor, tipo, data simples e categoria sugerida.
- Revisão dos campos antes de salvar.
- Entrada por voz quando `SpeechRecognition`/`webkitSpeechRecognition` estiver disponível; fallback para ditado do teclado do iPhone.
- Dashboard com saldo estimado, receitas, despesas, gastos de hoje e movimentações recentes.
- Histórico com busca e filtros; edição e exclusão.
- Relatórios mensais por categoria e visão dos últimos sete dias.
- Categorias personalizadas e saldo inicial.
- Backup/restore JSON e exportação CSV.
- Armazenamento local via IndexedDB e cache offline básico.

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
- O reconhecimento de voz do navegador pode variar conforme a versão do iOS/Safari. O ditado nativo do teclado do iPhone é a alternativa sem API paga.
- O interpretador é local e baseado em regras; ele não é um modelo de IA generativa. A classificação é uma sugestão que pode ser corrigida antes de salvar.
- A versão usa uma fonte externa do Google Fonts quando há internet; o layout e as funções principais não dependem dela.
