# WXRLD.IA — UORDI

PWA de controle financeiro pessoal em português brasileiro.

## Atualização v1.4
- Tela inicial compacta: dashboard com saldo, receitas, despesas e assistente; sem lista de movimentações nem bloco de visão geral.
- Histórico continua exclusivamente na aba Histórico.
- Indicadores de visão geral foram movidos para Relatórios.
- Resposta falada da wxrld aprimorada: ao tocar no microfone, a assistente inicia com “Pode falar. Estou ouvindo.” e depois começa a captura, para favorecer a liberação de áudio no iOS.
- Confirmação de movimentações permanece obrigatória antes de salvar.
- Dados continuam no IndexedDB local; não limpar dados do Safari ao atualizar.

## Publicar no GitHub Pages
Envie os arquivos desta pasta para a raiz do repositório, substituindo os arquivos existentes. Preserve o arquivo `CNAME` já existente no repositório (se houver). Faça commit e aguarde a publicação do GitHub Pages.

## Instalar no iPhone
Abra a URL do GitHub Pages no Safari → Compartilhar → Adicionar à Tela de Início → habilite “Abrir como App da Web”.

## Observação sobre voz
A síntese de fala usa `speechSynthesis` do Safari/iOS e depende das vozes e permissões disponíveis no aparelho. O reconhecimento de fala também depende do suporte do Safari. Se o Safari não disponibilizar reconhecimento, a wxrld informa isso e permite registrar por texto.
