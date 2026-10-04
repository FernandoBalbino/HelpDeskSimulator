# HelpDeskSimulator — Central de Suporte Técnico

Simulador educacional de atendimento: converse com dez clientes fictícios e corrija os problemas em computadores Windows virtuais independentes.

**Aplicação:** [fernandobalbino.github.io/HelpDeskSimulator](https://fernandobalbino.github.io/HelpDeskSimulator/)

## Usar na aula

1. Abra o site e escolha **Começar expediente**. Antes disso, nenhum temporizador funciona.
2. Investigue pelo chat. As perguntas dão pistas graduais; solicitar acesso também está disponível imediatamente no botão de conexão.
3. Aguarde a autorização e conecte ao computador. Use as ferramentas do Windows para realizar a correção.
4. Solicite a verificação do cliente. Depois da confirmação, encerre o chamado.

Os dez chamados chegam ao longo do expediente: o primeiro imediatamente, os demais a cada 60–110 segundos. Você pode atender outro cliente enquanto aguarda uma resposta ou um download. Não há penalização por perguntar nem encerramento obrigatório por tempo. Planeje uma aula de 45–60 minutos; o ritmo depende da turma.

O relógio de atividade pausa quando a aba fica oculta ou é fechada. O expediente é salvo automaticamente no navegador e retoma sem consumir o tempo de ausência. O botão de reinício pede confirmação e remove somente o expediente deste aplicativo.

O som pode ser silenciado na barra lateral. Há tela cheia, foco visível e suporte a redução de animações. Em telas menores, use **Computador** / **Chat do cliente** para alternar. Em 1366×768, o chat remoto mantém pelo menos 300 px de largura.

## Rodar localmente

Requer Node.js 20 ou superior. A aplicação não precisa de compilação ou dependências para funcionar.

```sh
node scripts/serve.mjs
```

Abra `http://127.0.0.1:4173/`. Mantenha esse terminal aberto. Use HTTP local, pois módulos ES e Service Workers não funcionam corretamente ao abrir `index.html` diretamente como arquivo.

## Offline e instalação

Aguarde **Disponível offline** antes de desconectar. A primeira visita baixa os recursos locais dos dez computadores, incluindo imagens, fonte e runtime. O botão de instalação usa a opção do navegador; o Chrome também oferece instalação pelo menu. Há somente um Service Worker ativo para a Central; o registro original do OSLab é desativado nos computadores incorporados.

O cache é separado por versão e os caminhos são relativos, compatíveis com GitHub Pages em uma subpasta. Atualizações disponíveis só são aplicadas quando o usuário escolhe atualizar. Os dados de aula permanecem no próprio navegador e não são enviados a um servidor.

## Organização

- `js/helpdesk/tickets.mjs`: catálogo, diálogos, clientes, pistas e regras por cenário.
- `shift-engine.mjs`: cronograma salvo, relógio controlável, fila de eventos, estados e conclusão.
- `chat-engine.mjs`: opções contextualizadas e verificação liberada após a correção.
- `state-manager.mjs`: armazenamento versionado em `helpdesk.simulator.shift.v1`.
- `notification-manager.mjs`: mensagens não lidas, avisos e sons locais.
- `remote-session.mjs`: um único iframe ativo e snapshots isolados por cliente.
- `windows/`: runtime do OSLab, seus assets, dependências locais, testes e créditos preservados.
- `assets/avatars/` e `assets/screenshots/`: retratos fictícios e capturas dos estados iniciais reais do simulador.

O contrato local `OSLab.remote` expõe `initialize`, `snapshot`, `restore`, `pause` e `send`, com identificação do chamado. O snapshot inclui arquivos, Lixeira, rede, áudio, software, favoritos, abas, downloads, instalador, clipboard, seleção, pesquisa e geometria das janelas. O armazenamento interno do Windows fica em memória dentro do iframe; apenas a Central salva o conjunto por cliente.

## Cenários

| Cliente | Correção técnica |
|---|---|
| Lucas Almeida | Ativar Wi-Fi e conectar à rede com internet. |
| Mariana Costa | Pesquisar, baixar, instalar e abrir AppJavaFX. |
| Rafael Oliveira | Desinstalar AppJavaFX pelas Configurações e remover seus atalhos. |
| Ana Beatriz | Criar Documentos da Escola dentro de Documentos. |
| Carlos Henrique | Adicionar hardware.oslab.local aos favoritos persistentes. |
| Gabriela Martins | Retirar o mudo e ajustar o volume acima de zero. |
| Pedro Santos | Mover o arquivo original trabalho-escola.docx de Downloads para Documentos. |
| Juliana Lima | Criar e abrir um atalho na Área de Trabalho para Materiais da Escola. |
| Bruno Ferreira | Restaurar Relatorio.pdf da Lixeira para sua pasta original. |
| Fernanda Rocha | Liberar 2 GB, esvaziando descartáveis da Lixeira e preservando documentos pessoais. |

As validações consultam o estado do computador. Uma confirmação é invalidada se a correção for desfeita. Após dez encerramentos, o resumo mostra tempo ativo, perguntas, acessos e média por atendimento.

## Verificação

```sh
node tests/run-tests.mjs
```

Executa 23 verificações da Central e 24 testes herdados do OSLab, sem instalar pacotes. Inclui atrasos com relógio controlado, chegada gradual, diálogos, autorização, persistência, pausa, isolamento e as dez validações.

Para a verificação completa pela interface, com o servidor local aberto:

```sh
npm install
npx playwright install chromium
node scripts/qa-e2e.mjs
node scripts/qa-offline.mjs
```

O script usa Chrome instalado no Windows quando disponível; `CHROME_PATH` permite escolher outro executável. `PLAYWRIGHT_PATH` pode apontar para um runtime já existente. `QA_URL` permite verificar a publicação. As evidências locais ficam em `qa-evidence/`, excluídas do Git. O teste da interface executa as dez correções com cliques e teclado; só os atrasos são acelerados.

Para alterar recursos offline, execute `node scripts/build-precache.mjs` e incremente a versão em `service-worker.js`. A publicação é estática a partir de `main`, sem build de frontend.

## Componentes reutilizados e limites

Reutiliza [OSLab no commit 357a661](https://github.com/FernandoBalbino/OSLab/tree/357a66122f3819b0534e37bb2a20c35e12e9b887): Explorador, Lixeira, Configurações, rede, volume, navegador, instalador, sistema de arquivos e gerenciador de janelas. A direção visual da Central usa como referência o [Customer Support Dashboard UI Kit no Figma](https://www.figma.com/design/6UYQWYigSqjdyGbw7iTF5X/Customer-Support-Dashboard-UI-Kit--Community-?node-id=3900-54686). Consulte [os créditos](THIRD_PARTY_NOTICES.md) para os recursos incorporados.

Todo atendimento, rede, download e instalação é simulado. Não há acesso remoto real, autenticação, integração com clientes externos nem execução de programas no computador físico. O aplicativo cobre as ferramentas necessárias aos dez cenários, sem reproduzir todas as funções do Windows. A persistência depende de o navegador permitir armazenamento local; limpar os dados do site remove o expediente. A validação automatizada usa Chrome desktop; testes em dispositivos físicos e outros navegadores não são presumidos.
