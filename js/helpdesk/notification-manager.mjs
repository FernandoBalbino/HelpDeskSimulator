export class NotificationManager {
  constructor(engine, select) {
    this.engine = engine; this.select = select; this.audio = null;
    this.root = document.querySelector('#notifications');
    engine.subscribe((event) => { if (event.type === 'notification') this.show(event); });
  }
  activateSound() {
    if (this.engine.state.muted) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (Audio) { this.audio ||= new Audio(); this.audio.resume().catch(() => {}); }
  }
  chime(kind) {
    if (!this.audio || this.engine.state.muted || this.audio.state !== 'running') return;
    const oscillator = this.audio.createOscillator(); const gain = this.audio.createGain();
    const now = this.audio.currentTime;
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(kind === 'resolved' ? 740 : 590, now);
    oscillator.frequency.setValueAtTime(kind === 'resolved' ? 880 : 720, now + .08);
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.035, now + .02); gain.gain.exponentialRampToValueAtTime(.0001, now + .24);
    oscillator.connect(gain); gain.connect(this.audio.destination); oscillator.start(now); oscillator.stop(now + .25);
  }
  show(event) {
    const toast = document.createElement('article'); toast.className = `toast toast-${event.kind}`;
    const icon = document.createElement('span'); icon.className = 'toast-icon'; icon.textContent = event.kind === 'resolved' ? '✓' : event.kind === 'remote' ? '↗' : '●';
    const content = document.createElement('button'); content.type = 'button'; content.className = 'toast-content';
    const title = document.createElement('strong'); title.textContent = event.title;
    const text = document.createElement('span'); text.textContent = event.message;
    content.append(title, text); content.addEventListener('click', () => { this.select(event.ticketId); toast.remove(); });
    const close = document.createElement('button'); close.type = 'button'; close.className = 'toast-close'; close.setAttribute('aria-label', 'Fechar notificação'); close.textContent = '×'; close.addEventListener('click', () => toast.remove());
    toast.append(icon, content, close); this.root.append(toast);
    while (this.root.children.length > 3) this.root.firstElementChild.remove();
    setTimeout(() => toast.remove(), 6000); this.chime(event.kind);
  }
}
