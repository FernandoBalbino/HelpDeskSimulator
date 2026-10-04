export function additionalTickets(conversation) { return [
  {
    id: 'tiago', name: 'Tiago Souza', role: 'Aluno', title: 'Nome do trabalho confuso', initials: 'TS', color: '#e7edff',
    opening: 'Meu trabalho ficou com um nome estranho. Quero deixar mais fácil de reconhecer.',
    followups: ['Você precisa que eu confirme o nome que quero?', 'É o mesmo trabalho. Só preciso mudar o nome.'],
    confirmation: 'Agora ficou Atividade de Informática.docx. Está certinho!', seed: 'rename', validation: 'rename',
    conversation: conversation('Meu trabalho ficou com um nome estranho. Quero deixar mais fácil de reconhecer.', [
      { id: 'name', question: 'Como o arquivo está chamado hoje?', answer: 'Está como atividade-final (1).docx, em Documentos.', followup: 'Qual nome você gostaria de usar?', detail: 'Atividade de Informática.docx. Pode manter o arquivo em Documentos.' },
      { id: 'location', question: 'Em qual pasta está o trabalho?', answer: 'Em Documentos. É o arquivo atividade-final (1).docx.', followup: 'Você quer mudar o nome ou o conteúdo?', detail: 'Só o nome, para Atividade de Informática.docx. Não precisa editar o texto.' },
      { id: 'keep', question: 'É para manter o mesmo arquivo?', answer: 'Sim, só quero dar um nome mais claro.', followup: 'Pode me dizer o nome completo que você quer?', detail: 'Atividade de Informática.docx, com a extensão no final.' },
    ]),
  },
  {
    id: 'beatriz', name: 'Beatriz Nunes', role: 'Secretaria', title: 'Uma cópia para acesso rápido', initials: 'BN', color: '#fae6df',
    opening: 'Preciso deixar uma cópia de um comunicado na Área de Trabalho, mas sem tirar o original.',
    followups: ['O arquivo original precisa continuar em Documentos.', 'Quero só uma cópia, para abrir rapidamente.'],
    confirmation: 'A cópia está na Área de Trabalho e o original continua em Documentos. Obrigada!', seed: 'copy', validation: 'copy',
    conversation: conversation('Preciso deixar uma cópia de um comunicado na Área de Trabalho, mas sem tirar o original.', [
      { id: 'file', question: 'Qual arquivo você quer copiar?', answer: 'Comunicado.pdf. Ele está em Documentos.', followup: 'Onde deve ficar a cópia?', detail: 'Na Área de Trabalho, com o mesmo nome Comunicado.pdf.' },
      { id: 'original', question: 'O original deve continuar na mesma pasta?', answer: 'Sim. Não pode sair de Documentos.', followup: 'Você precisa de uma cópia do arquivo ou um atalho?', detail: 'Uma cópia mesmo, do Comunicado.pdf, na Área de Trabalho.' },
      { id: 'destination', question: 'Você pode confirmar o local de destino?', answer: 'A Área de Trabalho. Vou usar a cópia durante o atendimento.', followup: 'Qual é o nome do documento original?', detail: 'Comunicado.pdf, em Documentos. Preserve esse original.' },
    ]),
  },
  {
    id: 'diego', name: 'Diego Ribeiro', role: 'Projetos', title: 'Foto fora do lugar', initials: 'DR', color: '#e0f2df',
    opening: 'Uma foto ficou solta na Área de Trabalho. Quero guardar com as outras imagens.',
    followups: ['Você encontrou a foto da feira?', 'Não precisa criar outra cópia. Só organizar a original.'],
    confirmation: 'Encontrei foto-feira.png em Imagens. Ficou organizado, obrigado!', seed: 'pictures', validation: 'pictures',
    conversation: conversation('Uma foto ficou solta na Área de Trabalho. Quero guardar com as outras imagens.', [
      { id: 'photo', question: 'Qual é o nome da foto?', answer: 'foto-feira.png. Está na Área de Trabalho.', followup: 'Em qual pasta você quer guardá-la?', detail: 'Na pasta Imagens, por favor.' },
      { id: 'destination', question: 'Onde você costuma guardar suas imagens?', answer: 'Na pasta Imagens do computador.', followup: 'Você quer mover a foto ou deixar uma cópia?', detail: 'Mover a foto-feira.png. Não precisa deixar outra na Área de Trabalho.' },
      { id: 'origin', question: 'A foto está dentro de alguma pasta?', answer: 'Não. O arquivo foto-feira.png está solto na Área de Trabalho.', followup: 'Podemos manter o mesmo nome?', detail: 'Sim, só mova o arquivo original para Imagens.' },
    ]),
  },
  {
    id: 'sofia', name: 'Sofia Mendes', role: 'Professora', title: 'Uma aba que não preciso mais', initials: 'SM', color: '#ede0f6',
    opening: 'Abri umas páginas no navegador e queria fechar uma delas sem perder meu material.',
    followups: ['O guia de hardware precisa continuar aberto.', 'Quero fechar só a aba do vídeo.'],
    confirmation: 'A aba do YouTube fechou e o guia de hardware continua aberto. Perfeito!', seed: 'tabs', validation: 'tabs',
    conversation: conversation('Abri umas páginas no navegador e queria fechar uma delas sem perder meu material.', [
      { id: 'close', question: 'Qual página você quer fechar?', answer: 'A aba do YouTube. Não vou usar mais esse vídeo.', followup: 'Qual página deve continuar aberta?', detail: 'Hardware — Guia Básico, em hardware.oslab.local.' },
      { id: 'keep', question: 'Qual material você precisa manter aberto?', answer: 'O guia básico de hardware, em hardware.oslab.local.', followup: 'Qual aba está sobrando?', detail: 'A do YouTube. Feche só ela, sem fechar o navegador inteiro.' },
      { id: 'browser', question: 'Você está usando qual navegador?', answer: 'O Chrome. Tem mais de uma aba aberta lá em cima.', followup: 'Quer fechar o navegador ou apenas uma aba?', detail: 'Só a aba do YouTube. O guia de hardware deve continuar aberto.' },
    ]),
  },
  {
    id: 'andre', name: 'André Lopes', role: 'Biblioteca', title: 'Preciso de outro navegador', initials: 'AL', color: '#e0ecf4',
    opening: 'Quero usar outro navegador aqui, mas ele ainda não aparece no computador.',
    followups: ['O navegador que preciso é o Firefox.', 'Pode manter o Chrome também. Quero ter as duas opções.'],
    confirmation: 'O Firefox instalou e abriu. Era isso que eu precisava, obrigado!', seed: 'browser-install', validation: 'browser-install',
    conversation: conversation('Quero usar outro navegador aqui, mas ele ainda não aparece no computador.', [
      { id: 'browser', question: 'Qual navegador você quer usar?', answer: 'O Firefox, por favor.', followup: 'Você quer manter o navegador que já está instalado?', detail: 'Sim. Pode usar o Chrome para pesquisar e baixar o Firefox, sem remover nada.' },
      { id: 'installed', question: 'Você já procurou esse navegador no Menu Iniciar?', answer: 'Procurei o Firefox, mas não está instalado.', followup: 'Quer que eu instale e abra para você testar?', detail: 'Sim. Instale o Firefox e abra no final, para eu conferir.' },
      { id: 'purpose', question: 'Você precisa instalar ou apenas abrir outro navegador?', answer: 'Instalar. Quero ter o Firefox como mais uma opção.', followup: 'Podemos baixar usando o Chrome atual?', detail: 'Pode sim. Depois abra o Firefox para confirmar que funcionou.' },
    ]),
  },
]; }
