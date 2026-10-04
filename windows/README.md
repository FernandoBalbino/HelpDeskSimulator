# OSLab

Laboratório virtual estático para alunos praticarem conceitos de Sistemas Operacionais em uma interface inspirada no Windows 11. O projeto funciona somente com HTML, CSS e JavaScript puro, sem backend ou etapa de compilação, e é compatível com GitHub Pages.

## Versão publicada

- Aplicação: <https://fernandobalbino.github.io/OSLab/>
- Código-fonte: <https://github.com/FernandoBalbino/OSLab>

## Principais recursos

- entrada direta na tela de login do perfil **Aluno**, sem tela de carregamento;
- solicitação de tela cheia após uma ação do usuário;
- área de trabalho limpa;
- Computador, Lixeira, Explorador de Arquivos, Google e Configurações;
- menu Iniciar, pesquisa, barra de tarefas, relógio e painel de configurações rápidas inspirado no original do win11React;
- várias janelas abertas ao mesmo tempo, com foco independente e controles para mover, redimensionar, minimizar, maximizar, restaurar e fechar;
- aplicativo Configurações em português, com telas próprias para Sistema, Bluetooth e dispositivos, Rede e Internet, Personalização, Aplicativos e Hora e idioma;
- aplicativo Missões com 12 atividades reais, progressão linear, dicas, pontuação, medalhas, checklist, retomada e limpeza de cenários;
- aplicativo Exercícios com 10 diagnósticos de Sistema e Rede, progressão sequencial, ajudante robô, dicas passo a passo sob demanda, testes finais e restauração segura do ambiente;
- laboratório VPN com sete missões práticas, servidores comerciais e corporativos, indicador global, sites simulados, dicas progressivas, revisão final e modo professor;
- trilha **Instalação e Desinstalação** com 12 missões, Google local, downloads `.exe` de 60 segundos, instaladores em etapas, atalhos sincronizados, pacote Office fictício e Painel de Controle clássico;
- Gerenciador de Tarefas inspirado no Windows 11, com processos dinâmicos, pesquisa por nome/PID, seleção, ordenação, grupos, modo de eficiência e encerramento de tarefas;
- menu de contexto inspirado no Windows 11, com submenus de exibição, classificação e criação;
- menu de contexto próprio para arquivos e pastas, com ações de abrir, renomear, copiar caminho e excluir;
- sistema de arquivos hierárquico em Área de Trabalho, Documentos, Downloads e Imagens, com criar, renomear, recortar, copiar, colar, mover e pesquisa recursiva;
- Lixeira funcional para árvores de pastas, com restauração, exclusão permanente e esvaziamento;
- sete papéis de parede selecionáveis, aplicados imediatamente e preservados no navegador;
- distribuição automática dos ícones da área de trabalho em novas colunas, sempre limitada à região acima da barra de tarefas;
- persistência versionada do sistema e do progresso das missões no `localStorage`.

## Missões

As 12 missões cobrem abertura de aplicativos, controle de janelas, criação/renomeação/movimentação/cópia/restauração/pesquisa de arquivos, personalização, volume, encerramento de aplicativo travado e organização integrada do computador.

O ciclo real é: o motor prepara o cenário, o aluno age nos aplicativos do simulador, o barramento recebe o evento depois da alteração de estado e a missão valida o resultado final. Uma missão ativa aparece em um widget flutuante acima da barra de tarefas.

## Exercícios de diagnóstico

O aplicativo **Exercícios** fica na Área de Trabalho, no menu Iniciar e na pesquisa. Os dez cenários cobrem armazenamento cheio, programa travado, CPU alta, falta de RAM, inicialização lenta, Wi-Fi desativado, modo avião, cabo Ethernet, IP incorreto e falha de DNS.

Cada exercício prepara um problema temporário e acompanha o estado real do simulador. O percurso começa no exercício 1 e cada etapa seguinte só é liberada depois da conclusão de todas as anteriores. Abrir uma ferramenta não conclui a atividade: o aluno precisa corrigir a causa e executar **Testar novamente**. A orientação completa informa o que abrir, onde clicar, como fazer e como conferir, mas só é revelada quando o aluno aperta **Dica**. Reiniciar, sair, trocar de atividade ou recarregar restaura o sistema ao estado anterior; somente conclusões, tentativas, dica e progresso ficam no `localStorage`.

O Terminal aceita `ipconfig`, `ipconfig /all`, `ping` e `nslookup`. Configurações de Rede, o navegador e os comandos usam a mesma rede virtual, portanto seus resultados permanecem coerentes mesmo sem internet real.

## Laboratório VPN

Os aplicativos **VPN** e **Laboratório VPN** ficam na Área de Trabalho, no menu Iniciar e na pesquisa. As sete missões cobrem catálogo regional, acesso remoto à empresa, IP público aparente, Wi-Fi público, análise de risco bancária, latência em videoconferência e allowlist de IP da escola. Elas são liberadas em ordem e cada uma usa ações reais dentro do desktop simulado.

O navegador oferece páginas locais para `netflix.com`, `meuip.com`, `portal.empresa.local`, `bancoos.com`, `speedtest.os`, `meet.os` e `admin.escola.local`. A página captura a conexão no momento em que é aberta ou atualizada; assim, trocar o servidor VPN não muda silenciosamente uma página já carregada. O catálogo fictício possui 20 capas locais e a atividade regional de Supernatural diferencia Brasil e Estados Unidos.

O estado canônico da conexão é mantido por `js/vpn/vpn-state.js` na chave `oslab.vpn.state.v1`. O motor das atividades usa `js/vpn/vpn-lab-engine.js`, e as conclusões, dicas, checklist e revisão ficam em `oslab.vpn.progress.v1`. Para adicionar um servidor, inclua a definição em `servers` dentro de `vpn-state.js`; para adicionar uma missão, crie a entrada estruturada em `vpn-mission-catalog.js` e a respectiva regra de checklist no motor.

As capas estão em `assets/vpn/posters` e seus créditos em `assets/vpn/posters/CREDITS.md`; as bandeiras e licença ficam em `assets/vpn/flags`. **Redefinir laboratório** apaga conexão e progresso VPN. O modo professor abre pelo botão **Painel do professor** no aplicativo VPN ou pelo atalho `Ctrl + Shift + Alt + V`, permitindo selecionar Wi-Fi, servidor, missão e conclusão. Tudo é simulado: não há túnel, consulta de IP, acesso bancário, streaming ou conexão a uma rede real.

## Instalação e desinstalação de programas

O aplicativo **Instalação de Programas** fica na Área de Trabalho e no Menu Iniciar. Sua trilha preserva as missões originais e adiciona 12 atividades sequenciais: abrir o navegador, pesquisar AppJavaFX, escolher o resultado correto, encontrar o download, aguardar 60 segundos, abrir o `.exe`, concluir o instalador, executar o programa, localizar o pacote Office, instalar Word/Excel/Apresentações, testar os três aplicativos e remover o AppJavaFX pelo Painel de Controle.

O navegador continua totalmente local. A página inicial lembra o Google em tema claro e responde a pesquisas por AppJavaFX, pacote Office, Word, Excel, apresentações, leitor PDF, editor de texto, navegador e programas para computador. Os primeiros resultados de AppJavaFX e Office abrem landing pages fictícias completas; nenhum endereço externo é carregado.

Os downloads são temporizadores visuais de exatamente 60 segundos. `AppJavaFX-Setup.exe` e `OfficeSetup.exe` nunca existem como executáveis reais. O assistente reutilizável possui destino, opções, confirmação, progresso e conclusão. No AppJavaFX, a caixa **Criar atalho na Área de Trabalho** controla o Desktop, enquanto o Menu Iniciar recebe o programa em qualquer instalação. O pacote Office adiciona Word, Excel e Apresentações Slides, cada um com uma interface visual própria.

O estado canônico fica em `js/install/software-state.js`, persistido na chave `oslab.software.state.v1`. Downloads, programas instalados, atalhos, pesquisas, sites visitados, instaladores e programas abertos são atualizados pelo mesmo módulo. O progresso pedagógico usa `oslab.install.missions.progress.v1`. **Redefinir trilha** limpa somente esse laboratório e seus programas simulados.

O **Painel de Controle** segue a aparência clássica por categorias. Em **Programas → Desinstalar um programa**, a tabela Programas e Recursos reflete imediatamente o estado instalado. Ao remover o AppJavaFX, sua janela, o item da tabela e os atalhos do Menu Iniciar e da Área de Trabalho desaparecem juntos.

### Teste manual da trilha de instalação

1. Entre com a senha `alunos2026`, abra **Instalação de Programas** e inicie a missão 1.
2. Abra o Google, pesquise `AppJavaFX` e escolha o primeiro resultado.
3. Use o menu **Download**, baixe `AppJavaFX-Setup.exe` e acompanhe os 60 segundos no painel do navegador.
4. Abra o arquivo, avance até as opções, marque o atalho, instale e conclua.
5. Abra o AppJavaFX pela Área de Trabalho. Para testar a opção contrária, reinstale sem marcar a caixa e confirme que ele permanece apenas no Menu Iniciar.
6. Pesquise `pacote office`, abra o primeiro resultado, baixe `OfficeSetup.exe`, aguarde e instale o pacote.
7. Abra Word, Excel e Apresentações Slides pelo Menu Iniciar.
8. Abra **Painel de Controle → Programas → Desinstalar um programa**, selecione AppJavaFX e confirme a remoção.

### Teste manual dos exercícios

1. **Armazenamento cheio:** localize os arquivos grandes, mova-os para a Lixeira, esvazie-a e use **Testar novamente** para concluir o download.
2. **Programa travado:** selecione o Editor de Texto marcado como não respondendo no Gerenciador de Tarefas e finalize somente esse processo.
3. **Computador muito lento:** ordene ou compare a CPU, encerre o Sincronizador de Mídia e confirme que o uso e a velocidade normalizaram.
4. **Memória RAM insuficiente:** libere memória encerrando um aplicativo não essencial e teste a abertura do navegador.
5. **Inicialização lenta:** abra Aplicativos de inicialização, desabilite itens de alto impacto, mantenha a Segurança do Windows e reinicie de forma simulada.
6. **Wi-Fi desativado:** ative o Wi-Fi, conecte-se à `REDE_OSLAB` e teste o navegador.
7. **Modo avião:** desative o modo avião, reative e conecte o Wi-Fi, depois teste uma página.
8. **Cabo Ethernet:** selecione Ethernet, conecte o cabo virtual, aguarde a configuração e teste a navegação.
9. **IP incorreto:** ative DHCP ou informe um IP da rede `192.168.1.0/24` e confirme com `ping 192.168.1.1`.
10. **DNS:** compare os pings por IP e nome, configure DNS automático ou `8.8.8.8` e teste `google.com` no Terminal e navegador.

## Acesso

- Perfil: `Aluno`
- Senha: `alunos2026`

A senha é validada apenas no navegador. Como o projeto é totalmente estático e destinado ao GitHub Pages, esse login é uma simulação visual e não deve ser tratado como autenticação segura.

Os navegadores só permitem entrar em tela cheia depois de um clique ou envio de formulário. O OSLab solicita esse modo ao confirmar a senha e também oferece o botão **Abrir em tela cheia** na tela de login. Se o navegador negar a permissão, a interface continua ocupando toda a área disponível da guia.

## Personalização

Abra **Configurações → Personalização → Plano de fundo** para escolher entre `bg.png` e `bg2.jpg` até `bg7.jpg`. A seleção é salva no `localStorage`, portanto continua ativa após atualizar ou reabrir o site no mesmo navegador.

## Arquivos, pastas e Lixeira

Clique com o botão direito na área de trabalho e escolha **Novo → Pasta** ou **Novo → Documento de Texto**. O nome entra em edição imediatamente; confirme clicando fora ou pressionando **Enter**. Pastas podem ser abertas no Explorador e arquivos de texto possuem uma área de edição com salvamento automático.

Ao clicar com o botão direito em um item, use **Renomear** ou **Excluir**. A exclusão envia o item para a Lixeira. Dentro da Lixeira, selecione o item para habilitar **Restaurar** e **Excluir permanentemente**.

As preferências, a árvore de arquivos e a Lixeira ficam reunidas na chave versionada `oslab-state-v1`. Estados antigos são migrados para a árvore hierárquica sem descartar os itens existentes. O progresso pedagógico usa a chave separada `oslab.missions.progress`.

## Gerenciador de Tarefas

Clique com o botão direito na barra de tarefas e escolha **Gerenciador de Tarefas**. A lista usa processos fictícios do Windows com consumo baixo e adiciona em tempo real os aplicativos abertos. Processos essenciais são protegidos; aplicativos podem ser finalizados e têm sua janela encerrada pelo controlador central.

## Arquitetura

- `js/core`: eventos, registro de aplicativos, sistema de arquivos e processos;
- `js/apps`: Missões, Exercícios, Gerenciador de Tarefas, Terminal, navegador offline e superfícies de diagnóstico;
- `js/missions`: catálogo, motor e persistência;
- `js/exercises`: catálogo, máquina de estados e persistência dos exercícios;
- `js/vpn`: estado global, catálogo, motor e persistência do laboratório VPN;
- `js/install`: estado de software, catálogo, motor e persistência da trilha de instalação;
- `js/core/network-manager.js` e `js/core/system-state.js`: estado canônico de rede, armazenamento, desempenho e snapshots;
- `js/ui`: notificações, confirmações, widget e modal de conclusão;
- `script.js`: integração com o shell, as janelas e os aplicativos existentes;
- `css/learning.css`, `css/vpn.css`, `css/install-lab.css`, `css/software-apps.css`, `css/missions.css` e `css/task-manager.css`: estilos das superfícies educacionais e do sistema.

Para adicionar uma missão, inclua uma entrada em `js/missions/mission-catalog.js` com dados, objetivos, dicas e as funções `setup`, `validate`, `cleanup` e `reset`. A validação deve consultar o estado real e reagir aos eventos de `OSLab.events`.

## Executar localmente

Abra um servidor HTTP na raiz do projeto. Um exemplo com Python:

```powershell
python -m http.server 4173
```

Depois, acesse `http://localhost:4173`.

Execute as verificações automatizadas com:

```powershell
node tests/run-tests.js
```

## Publicação no GitHub Pages

O projeto usa somente caminhos relativos e não exige etapa de compilação. A raiz da branch `main` é publicada diretamente pelo GitHub Pages. O arquivo `.nojekyll` evita processamento desnecessário pelo Jekyll.

## Instalação e uso offline

O OSLab é uma PWA instalável. Após o primeiro acesso completo, o Service Worker salva localmente a interface, scripts, estilos, papéis de parede, ícones, imagens de configurações, missões e demais recursos internos.

No Chrome ou Chromebook, use **Instalar para usar offline** na tela de login ou no menu Iniciar. O progresso das missões, dos exercícios e as preferências continuam salvos no `localStorage` do dispositivo. O navegador, o Terminal e todas as funções internas usam dados simulados locais e continuam disponíveis sem internet.

O cache atual é `oslab-offline-v9`. Ao alterar recursos, incremente `CACHE_VERSION` em `service-worker.js`; versões antigas são excluídas automaticamente e o site oferece a atualização quando a nova versão está pronta.

## Créditos

Parte dos ícones e da referência de interação foi adaptada do projeto [blueedgetechno/win11React](https://github.com/blueedgetechno/win11React), disponibilizado sob licença CC0-1.0. A cópia da licença está em `LICENSE-win11React.txt`.
