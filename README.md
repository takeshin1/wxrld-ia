# WXRLD.IA

Aplicativo PWA de controle financeiro pessoal em português brasileiro.

## Versão 1.3
- Interface com identidade verde-floresta e bege champanhe.
- Entrada de texto pelo campo de mensagem.
- Botão circular de microfone para reconhecimento de fala do navegador, quando disponível.
- Botão circular de balão para enviar a mensagem digitada.
- Resposta falada em português brasileiro usando a síntese de voz do dispositivo, quando disponível.
- Após reconhecer uma fala, a wxrld repete os dados interpretados e pede confirmação na tela antes de salvar.
- Os registros permanecem no IndexedDB local do navegador.

## Publicar no GitHub Pages
Envie os arquivos desta pasta para a raiz do repositório e habilite GitHub Pages na branch `main`, pasta `/ (root)`. Preserve qualquer arquivo `CNAME` que já esteja configurado no repositório.

## Observação sobre voz no iPhone
O botão de microfone usa a API de reconhecimento de fala que o Safari disponibilizar (`SpeechRecognition`/`webkitSpeechRecognition`). A disponibilidade depende da versão do iOS/Safari e das permissões. Se o navegador não disponibilizar essa API, o app informa isso claramente; não simula uma gravação. A resposta falada usa `speechSynthesis` quando suportada.

A interpretação financeira desta versão é local, baseada em regras; não é um modelo generativo conectado. O aplicativo não envia as transações para um servidor.
