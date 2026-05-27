// Manages delayed deletions that can be cancelled (undo) or flushed immediately (page close)
const pending = new Map(); // key → { execute, timer }

export function scheduleDeletion(key, executeFn, delay = 5000) {
  const timer = setTimeout(() => {
    pending.delete(key);
    executeFn().catch(() => {});
  }, delay);
  pending.set(key, { execute: executeFn, timer });
}

export function cancelDeletion(key) {
  const entry = pending.get(key);
  if (!entry) return false;
  clearTimeout(entry.timer);
  pending.delete(key);
  return true;
}

function flushPending() {
  if (pending.size === 0) return;
  for (const [, { execute, timer }] of pending) {
    clearTimeout(timer);
    execute().catch(() => {});
  }
  pending.clear();
}

// Flush when tab is hidden (switching apps on mobile, locking screen, etc.)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushPending();
});
// Flush on page unload (closing tab, navigating away)
window.addEventListener('pagehide', flushPending);
