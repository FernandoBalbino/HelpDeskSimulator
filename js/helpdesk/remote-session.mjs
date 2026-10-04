import { byId } from './tickets.mjs';

export class RemoteSession {
  constructor(engine, container, onReady = () => {}) {
    this.engine = engine;
    this.container = container;
    this.onReady = onReady;
    this.frame = null;
    this.clientId = null;
    this.ready = false;
    window.HelpDeskRemoteHost = {
      initial: (source) => {
        if (!this.frame || source !== this.frame.contentWindow || !this.clientId) throw new Error('Sessão remota inválida');
        const definition = byId[this.clientId];
        return { clientId: this.clientId, name: definition.name, seed: definition.seed, pc: this.engine.snapshot().tickets[this.clientId].pc };
      },
      now: () => this.engine.state.elapsedMs,
      changed: (source, clientId, pc) => {
        if (source === this.frame?.contentWindow && clientId === this.clientId) this.engine.updatePc(clientId, pc);
      },
      ready: (source, clientId) => {
        if (source !== this.frame?.contentWindow || clientId !== this.clientId) return;
        this.ready = true; this.container.classList.remove('is-loading'); this.onReady(clientId);
      },
    };
  }
  flush() {
    if (!this.ready || !this.frame) return;
    const pc = this.frame.contentWindow.OSLab?.remote?.snapshot();
    if (pc) this.engine.updatePc(this.clientId, pc);
  }
  pause(paused) { this.frame?.contentWindow.OSLab?.remote?.pause(paused); }
  show(clientId) {
    if (this.switching) return;
    if (!this.engine.state.tickets[clientId]?.remote.connected) return;
    if (clientId === this.clientId && this.frame) return;
    this.switching = true;
    this.flush(); this.ready = false; this.clientId = clientId;
    const frame = document.createElement('iframe');
    frame.title = `Computador remoto de ${byId[clientId].name}`;
    frame.src = `./windows/index.html?client=${encodeURIComponent(clientId)}&session=${encodeURIComponent(this.engine.state.id)}`;
    frame.setAttribute('allow', 'fullscreen');
    this.frame = frame;
    this.container.replaceChildren(frame);
    this.container.classList.add('is-loading');
    this.switching = false;
  }
  detach() {
    this.flush(); this.frame?.remove(); this.frame = null; this.ready = false; this.clientId = null;
  }
}
