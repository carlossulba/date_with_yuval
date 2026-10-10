/* Shared setup: who is who, the sync room, the page header and small helpers. */

const CONFIG = {
  people: ['Carlos', 'Yuval'],
  // Both phones join this room automatically. Change it to anything else for a completely fresh start.
  room: 'cita-carlos-yuval-83lc3efjbk',
};

// Opening any page with ?room=something switches this browser to another room (handy for a test run).
// Open with ?room=default to go back to the normal room.
(() => {
  try {
    const r = new URLSearchParams(location.search).get('room');
    if (r === 'default') localStorage.removeItem('cita:room');
    else if (r) localStorage.setItem('cita:room', r);
    CONFIG.room = localStorage.getItem('cita:room') || CONFIG.room;
  } catch {}
})();

const App = {
  me() {
    try {
      const who = localStorage.getItem('cita:who');
      return CONFIG.people.includes(who) ? who : null;
    } catch { return null; }
  },
  setMe(name) {
    try { localStorage.setItem('cita:who', name); } catch {}
    document.dispatchEvent(new CustomEvent('who-changed'));
  },
  partner() {
    const me = App.me();
    return CONFIG.people.find(p => p !== me) || CONFIG.people[1];
  },
  esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Asks "who's this?" until the person picks a name, then calls back.
  askWho(onDone) {
    const gate = document.createElement('div');
    gate.className = 'gate';
    gate.innerHTML = `
      <div class="gate-card panel">
        <h2>Who's this?</h2>
        <p class="muted">So the page knows whose turn is whose.</p>
        <div class="gate-btns">
          ${CONFIG.people.map(p => `<button class="btn btn-ghost" data-who="${App.esc(p)}">${App.esc(p)}</button>`).join('')}
        </div>
      </div>`;
    gate.addEventListener('click', e => {
      const b = e.target.closest('[data-who]');
      if (!b) return;
      App.setMe(b.dataset.who);
      gate.remove();
      onDone && onDone();
    });
    document.body.appendChild(gate);
  },

  requireMe(onReady) {
    if (App.me()) onReady();
    else App.askWho(onReady);
  },

  // Home link, "you're X" chip and the connection status.
  mountHeader(target) {
    target.innerHTML = `
      <header class="topbar">
        <a class="back" href="index.html"><i class="ph ph-arrow-left"></i> Home</a>
        <div class="topbar-right">
          <button class="chip" type="button" data-whochip>You're <b></b></button>
          <span class="status" data-state="connecting" role="status"><span class="dot"></span><span class="label">Connecting</span></span>
        </div>
      </header>`;
    const chip = target.querySelector('[data-whochip]');
    const paintChip = () => { chip.querySelector('b').textContent = App.me() || '...'; };
    paintChip();
    chip.addEventListener('click', () => App.askWho());
    document.addEventListener('who-changed', paintChip);
    App.mountStatus(target.querySelector('.status'));
  },

  mountStatus(el) {
    const labels = { online: 'Synced', connecting: 'Connecting', offline: 'Offline: this phone only' };
    Sync.onStatus(s => {
      el.dataset.state = s;
      el.querySelector('.label').textContent = labels[s];
    });
  },
};
