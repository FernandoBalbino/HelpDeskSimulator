import { byId } from './tickets.mjs';

export function dialogueOptions(ticket) {
  if (!ticket || ticket.status === 'resolved' || ticket.typing || ticket.pending) return [];
  const node = byId[ticket.id].conversation[ticket.node] || byId[ticket.id].conversation.start;
  const options = node.options.slice(0, 3).map((option) => ({ ...option, kind: 'question' }));
  if (ticket.confirmed) return [{ id: 'close', label: 'Encerrar chamado como resolvido', kind: 'close' }];
  options.push({ id: 'verify', label: 'Verifique agora se o problema foi corrigido', kind: 'verify', disabled: !ticket.solved });
  options.push({ id: 'remote', label: ticket.remote.authorized ? (ticket.remote.connected ? 'Retomar acesso ao computador' : 'Conectar ao computador') : 'Solicitar acesso ao computador', kind: 'remote' });
  return options;
}
