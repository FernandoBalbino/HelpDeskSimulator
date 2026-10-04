// Dialogues describe clues. Technical rules live separately in validators.mjs.
function conversation(message, branches) {
  const basic = branches.map((b) => ({ id: b.id, label: b.question, next: b.id }));
  const nodes = { start: { message, options: basic } };
  for (const branch of branches) {
    const others = basic.filter((o) => o.id !== branch.id);
    nodes[branch.id] = {
      message: branch.answer,
      image: branch.image,
      options: [{ id: `${branch.id}-detail`, label: branch.followup, next: `${branch.id}-detail` }, ...others],
    };
    nodes[`${branch.id}-detail`] = { message: branch.detail, options: basic };
  }
  return nodes;
}

export const tickets = [
  {
    id: 'lucas', name: 'Lucas Almeida', role: 'Secretaria', title: 'Sem acesso à internet', initials: 'LA', color: '#d8edff',
    opening: 'Bom dia. Não estou conseguindo acessar a internet no computador.',
    followups: ['Ainda não consegui abrir meus sites. Você pode olhar?', 'Estou por aqui, caso precise de mais alguma informação.'],
    confirmation: 'Agora funcionou! Consegui abrir o site. Obrigado!',
    seed: 'network', validation: 'network',
    conversation: conversation('Bom dia. Não estou conseguindo acessar a internet no computador.', [
      { id: 'devices', question: 'Outros aparelhos estão acessando a internet?', answer: 'Sim, meu celular está funcionando normalmente no Wi-Fi.', followup: 'O celular está usando a mesma rede do computador?', detail: 'Sim, é a rede Escola_WiFi. Só o computador está com problema.' },
      { id: 'symbol', question: 'Aparece algum símbolo diferente perto do relógio?', answer: 'Tem um símbolo de globo ali. Mandei uma imagem.', image: 'network', followup: 'Isso apareceu hoje ou já estava assim antes?', detail: 'Hoje. Ontem eu estava usando o computador normalmente.' },
      { id: 'connection', question: 'Você sabe conferir a conexão do computador?', answer: 'Não sei onde vejo isso 😅. Pode olhar por aqui?', followup: 'Você chegou a mexer em alguma configuração?', detail: 'Talvez tenha clicado nos botões perto do relógio quando fui ajustar o som.' },
    ]),
  },
  {
    id: 'mariana', name: 'Mariana Costa', role: 'Coordenação', title: 'Programa necessário', initials: 'MC', color: '#ffe8d6',
    opening: 'Oi. Preciso usar um programa aqui e não estou encontrando.',
    followups: ['Tenho um projeto para abrir mais tarde. Você consegue me ajudar?', 'Pode me avisar quando eu puder testar o programa?'],
    confirmation: 'Perfeito, o AppJavaFX abriu! Agora consigo continuar.', seed: 'install', validation: 'install',
    conversation: conversation('Oi. Preciso usar um programa aqui e não estou encontrando.', [
      { id: 'program', question: 'Qual é o nome do programa que você precisa?', answer: 'É o AppJavaFX. A professora pediu para usar na atividade.', followup: 'Você precisa de alguma versão específica?', detail: 'A versão 1.0 serve. Tem o site dele na pesquisa do navegador.' },
      { id: 'search', question: 'Você procurou no Menu Iniciar?', answer: 'Procurei, mas não aparece nada com esse nome.', followup: 'Você já usou esse programa neste computador?', detail: 'Neste não. Antes eu usava o AppJavaFX em outro computador.' },
      { id: 'purpose', question: 'O que você está tentando fazer com o programa?', answer: 'Preciso abrir os exemplos de uma atividade de interfaces.', followup: 'Você recebeu o nome ou o endereço do aplicativo?', detail: 'Recebi sim: AppJavaFX. Anotei a solicitação em Documentos também.' },
    ]),
  },
  {
    id: 'rafael', name: 'Rafael Oliveira', role: 'Administrativo', title: 'Aplicativo que não uso mais', initials: 'RO', color: '#e2ddff',
    opening: 'Instalei uma coisa ontem e não quero mais no computador.',
    followups: ['Aquele programa continua aparecendo no computador.', 'Só quero remover o programa, mantendo meus documentos.'],
    confirmation: 'Sim, o programa saiu do computador. Era isso que eu precisava!', seed: 'uninstall', validation: 'uninstall',
    conversation: conversation('Instalei uma coisa ontem e não quero mais no computador.', [
      { id: 'which', question: 'Você lembra o nome do programa?', answer: 'Acho que é AppJavaFX. Tem um ícone com esse nome.', followup: 'É só esse programa que você quer remover?', detail: 'Sim. Meus documentos e os outros aplicativos podem ficar.' },
      { id: 'print', question: 'Você pode mostrar o que apareceu?', answer: 'Claro. Tirei um print da lista de programas.', image: 'apps', followup: 'Qual item dessa lista foi instalado ontem?', detail: 'O AppJavaFX. Instalei para testar, mas não vou usar mais.' },
      { id: 'tried', question: 'Você já tentou remover o programa?', answer: 'Apaguei o atalho uma vez, mas ele continuou no Menu Iniciar.', followup: 'Você chegou a usar a opção Desinstalar?', detail: 'Não. Não sei onde fica essa opção nas Configurações.' },
    ]),
  },
  {
    id: 'ana', name: 'Ana Beatriz', role: 'Professora', title: 'Organizar documentos', initials: 'AB', color: '#fce3e9',
    opening: 'Preciso organizar uns documentos e não sei muito bem como fazer.',
    followups: ['Queria deixar essa organização pronta para a aula.', 'Não precisa mover os arquivos agora. Só preparar o lugar para guardá-los.'],
    confirmation: 'A pasta está certinha em Documentos. Obrigada!', seed: 'folder', validation: 'folder',
    conversation: conversation('Preciso organizar uns documentos e não sei muito bem como fazer.', [
      { id: 'organize', question: 'Como você gostaria de organizar os documentos?', answer: 'Quero uma pasta separada para as coisas da escola.', followup: 'Que nome você quer dar a essa pasta?', detail: 'Documentos da Escola, por favor.' },
      { id: 'location', question: 'Em qual lugar do computador você quer guardar isso?', answer: 'Dentro de Documentos, para ficar tudo junto.', followup: 'A pasta deve ficar dentro de outra pasta?', detail: 'Não. Diretamente em Documentos, com o nome Documentos da Escola.' },
      { id: 'existing', question: 'Já existe alguma pasta para esses materiais?', answer: 'Ainda não. Só tenho alguns arquivos soltos.', followup: 'Você quer mover os arquivos ou criar a pasta primeiro?', detail: 'Só criar Documentos da Escola dentro de Documentos. Depois eu organizo os arquivos.' },
    ]),
  },
  {
    id: 'carlos', name: 'Carlos Henrique', role: 'Biblioteca', title: 'Acessar um site com facilidade', initials: 'CH', color: '#d5f2e6',
    opening: 'Tem um site que acesso todo dia e queria deixar mais fácil.',
    followups: ['Você precisa do endereço daquele site?', 'Queria conseguir abrir de novo sem precisar pesquisar toda vez.'],
    confirmation: 'Encontrei nos favoritos! Ficou bem mais fácil, obrigado.', seed: 'favorite', validation: 'favorite',
    conversation: conversation('Tem um site que acesso todo dia e queria deixar mais fácil.', [
      { id: 'site', question: 'Qual é o endereço do site?', answer: 'É hardware.oslab.local, o guia básico de hardware.', followup: 'Você costuma abrir pelo navegador deste computador?', detail: 'Sim. Uso o Chrome, que aparece como Google no computador.' },
      { id: 'current', question: 'Como você está abrindo esse site hoje?', answer: 'Digito o endereço ou pesquiso de novo toda vez.', followup: 'Você quer deixar o site salvo no próprio navegador?', detail: 'Isso. Quero encontrar Hardware — Guia Básico na lista de favoritos.' },
      { id: 'needed', question: 'Você precisa salvar a página ou apenas o endereço?', answer: 'Só o endereço. O conteúdo pode continuar no site.', followup: 'Você pode confirmar o nome da página?', detail: 'Hardware — Guia Básico. O endereço é hardware.oslab.local.' },
    ]),
  },
  {
    id: 'gabriela', name: 'Gabriela Martins', role: 'Sala de vídeo', title: 'Computador sem áudio', initials: 'GM', color: '#fff0bf',
    opening: 'Não estou ouvindo nada no computador.',
    followups: ['O vídeo está aberto, mas continuo sem ouvir.', 'Preciso do áudio para mostrar um material na aula.'],
    confirmation: 'Sim, voltou o som! Agora consigo ouvir normalmente.', seed: 'audio', validation: 'audio',
    conversation: conversation('Não estou ouvindo nada no computador.', [
      { id: 'headphones', question: 'Você está usando fone ou as caixas de som?', answer: 'As caixas de som do computador. Estão ligadas.', followup: 'As caixas funcionaram da última vez?', detail: 'Sim, ontem estava tudo normal. Não troquei nenhum cabo.' },
      { id: 'playing', question: 'O vídeo está reproduzindo ou está pausado?', answer: 'Está reproduzindo. A imagem e o tempo do vídeo avançam.', followup: 'Outros vídeos também ficam sem som?', detail: 'Sim. Testei dois e ficou igual.' },
      { id: 'volume', question: 'Aparece algo diferente no ícone de volume?', answer: 'Ele está meio apagado. Vou mandar o print.', image: 'audio', followup: 'Você tentou ajustar o som pelos botões perto do relógio?', detail: 'Cliquei ali antes, mas não sei se alterei alguma coisa.' },
    ]),
  },
  {
    id: 'pedro', name: 'Pedro Santos', role: 'Aluno', title: 'Arquivo que não encontro', initials: 'PS', color: '#dceafa',
    opening: 'Salvei um arquivo e agora não sei onde foi parar.',
    followups: ['Você conseguiu encontrar meu trabalho?', 'Quando achar, pode deixar em Documentos para eu conseguir abrir?'],
    confirmation: 'Achei meu trabalho em Documentos. Muito obrigado!', seed: 'find-file', validation: 'find-file',
    conversation: conversation('Salvei um arquivo e agora não sei onde foi parar.', [
      { id: 'name', question: 'Você lembra o nome do arquivo?', answer: 'Acho que é trabalho-escola.docx.', followup: 'Você quer deixá-lo em alguma pasta específica?', detail: 'Sim, em Documentos. É onde eu procuro meus trabalhos.' },
      { id: 'origin', question: 'O arquivo foi criado por você ou baixado?', answer: 'Baixei um modelo e salvei o meu trabalho nele.', followup: 'Você chegou a mover o arquivo depois de baixar?', detail: 'Não lembro de ter movido. Só sei que o nome é trabalho-escola.docx.' },
      { id: 'looked', question: 'Em quais pastas você já procurou?', answer: 'Na Área de Trabalho e em Documentos, mas não encontrei.', followup: 'Você procurou usando a pesquisa do Explorador?', detail: 'Ainda não. Quando achar, pode colocar trabalho-escola.docx em Documentos?' },
    ]),
  },
  {
    id: 'juliana', name: 'Juliana Lima', role: 'Pedagógico', title: 'Abrir uma pasta rapidamente', initials: 'JL', color: '#efdef7',
    opening: 'Uso uma pasta toda hora e queria deixar ela mais fácil de abrir.',
    followups: ['Queria acessar aquela pasta direto da Área de Trabalho.', 'Os materiais podem continuar onde estão.'],
    confirmation: 'O atalho abriu a pasta certa. Ficou ótimo!', seed: 'shortcut', validation: 'shortcut',
    conversation: conversation('Uso uma pasta toda hora e queria deixar ela mais fácil de abrir.', [
      { id: 'folder', question: 'Qual pasta você costuma usar?', answer: 'Materiais da Escola. Ela fica dentro de Documentos.', followup: 'Você quer um acesso a ela em qual lugar?', detail: 'Na Área de Trabalho, por favor.' },
      { id: 'move', question: 'Você quer mover a pasta ou manter onde está?', answer: 'Quero manter em Documentos. Não precisa mudar os arquivos.', followup: 'Um atalho na Área de Trabalho atende ao que você precisa?', detail: 'Sim, um atalho para Materiais da Escola seria perfeito.' },
      { id: 'access', question: 'Como você abre essa pasta atualmente?', answer: 'Abro o Explorador, entro em Documentos e depois procuro a pasta.', followup: 'Você pode confirmar o nome dela?', detail: 'Materiais da Escola. Quero abrir pelo atalho da Área de Trabalho.' },
    ]),
  },
  {
    id: 'bruno', name: 'Bruno Ferreira', role: 'Financeiro', title: 'Arquivo desapareceu', initials: 'BF', color: '#ffdecf',
    opening: 'Acho que apaguei um arquivo sem querer.',
    followups: ['Aquele relatório faz falta para o meu trabalho.', 'Você conseguiu conferir se ainda dá para recuperar?'],
    confirmation: 'O relatório voltou para Documentos! Obrigado por recuperar.', seed: 'restore', validation: 'restore',
    conversation: conversation('Acho que apaguei um arquivo sem querer.', [
      { id: 'name', question: 'Qual é o nome do arquivo?', answer: 'Relatorio.pdf. Eu estava organizando meus documentos.', followup: 'Em qual pasta ele estava?', detail: 'Em Documentos. Queria que voltasse para lá.' },
      { id: 'when', question: 'Quando você percebeu que o arquivo sumiu?', answer: 'Agora há pouco, depois que excluí algumas coisas.', followup: 'Você chegou a esvaziar a Lixeira?', detail: 'Não, só apertei Excluir. O arquivo se chama Relatorio.pdf.' },
      { id: 'backup', question: 'Existe outra cópia desse arquivo?', answer: 'Acho que não. É o relatório que estava em Documentos.', followup: 'Você lembra o nome completo?', detail: 'Relatorio.pdf, sem acento no nome do arquivo.' },
    ]),
  },
  {
    id: 'fernanda', name: 'Fernanda Rocha', role: 'Direção', title: 'Aviso de pouco espaço', initials: 'FR', color: '#dbf1ed',
    opening: 'Meu computador começou a reclamar de espaço e algumas coisas estão estranhas.',
    followups: ['Ainda preciso salvar meus arquivos de hoje.', 'Meus documentos pessoais são importantes. Pode preservá-los?'],
    confirmation: 'O aviso sumiu e tenho espaço para continuar. Obrigada!', seed: 'storage', validation: 'storage',
    conversation: conversation('Meu computador começou a reclamar de espaço e algumas coisas estão estranhas.', [
      { id: 'warning', question: 'Qual mensagem aparece no computador?', answer: 'Aparece “Pouco espaço em disco”. Enviei a imagem.', image: 'storage', followup: 'O aviso acontece quando você tenta salvar um arquivo?', detail: 'Sim. Preciso de pelo menos 2 GB livres para os materiais de hoje.' },
      { id: 'downloads', question: 'Você baixou arquivos grandes recentemente?', answer: 'Baixei testes e instaladores antigos. Acho que ficaram em Downloads.', followup: 'Há arquivos que podem ser descartados com segurança?', detail: 'Os arquivos identificados como descartáveis podem sair. Preserve meus documentos em Documentos.' },
      { id: 'cleanup', question: 'Você já tentou liberar espaço?', answer: 'Apaguei uma coisa, mas não parece ter liberado muito.', followup: 'Você esvaziou a Lixeira depois disso?', detail: 'Não. Não sabia que os arquivos continuam ocupando espaço lá.' },
    ]),
  },
];

tickets.forEach((ticket, index) => { ticket.order = index + 1; ticket.avatar = `assets/avatars/${ticket.id}.svg`; });
export const byId = Object.fromEntries(tickets.map((ticket) => [ticket.id, ticket]));
