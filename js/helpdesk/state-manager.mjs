export const STORAGE_KEY = 'helpdesk.simulator.shift.v1';
export const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

export function loadShift(storage) {
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    if (![1, 2].includes(saved?.version) || !Array.isArray(saved.events) || !saved.tickets || !['intro', 'running', 'finished'].includes(saved.phase)) return null;
    return saved;
  } catch { return null; }
}

export function saveShift(storage, state) {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); return Boolean(storage); }
  catch { return false; }
}
