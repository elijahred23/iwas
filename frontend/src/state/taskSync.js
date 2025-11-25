// Lightweight task change broadcaster so task updates refresh any open views.
// Uses EventTarget for in-app subscribers and BroadcastChannel to sync across tabs.
const EVENT = 'iwas:task-change';
const emitter = new EventTarget();
let channel = null;

try {
  channel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('iwas-task-sync')
    : null;
} catch {
  channel = null;
}

const emitLocal = (detail) => {
  emitter.dispatchEvent(new CustomEvent(EVENT, { detail }));
};

if (channel) {
  channel.onmessage = (e) => emitLocal(e.data);
}

export function broadcastTaskChange(detail = {}) {
  const payload = { at: Date.now(), ...detail };
  emitLocal(payload);
  if (channel) channel.postMessage(payload);
}

export function subscribeTaskChanges(fn) {
  if (typeof fn !== 'function') return () => {};
  const handler = (e) => fn(e.detail);
  emitter.addEventListener(EVENT, handler);
  return () => emitter.removeEventListener(EVENT, handler);
}
