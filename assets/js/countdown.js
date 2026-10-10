/*
  A countdown that runs on both phones at once. Either of you starts it and the other
  phone counts down to the exact same moment (handy for pressing play together).
*/
function mountCountdown(root, { page, slot, title, presets, idle }) {
  root.innerHTML = `
    <div class="timer">
      <h3>${App.esc(title)}</h3>
      <div class="timer-display" data-display aria-live="polite"></div>
      <div class="actions" data-buttons>
        ${presets.map((p, i) => `<button class="btn ${presets.length === 1 ? 'btn-primary' : 'btn-ghost'}" data-preset="${i}">${p.icon ? `<i class="ph ${p.icon}"></i> ` : ''}${App.esc(p.label)}</button>`).join('')}
        <button class="btn-link" data-stop hidden>Cancel</button>
      </div>
    </div>`;

  const display = root.querySelector('[data-display]');
  const stopBtn = root.querySelector('[data-stop]');
  let tick = null;
  let buzzedFor = null;

  function current() {
    const evts = Sync.events(page).filter(e => e.slot === slot);
    const last = evts[evts.length - 1];
    return last && last.k === 'count' ? last : null;
  }

  const fmt = ms => {
    const s = Math.ceil(ms / 1000);
    if (s < 60) return String(s);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  function render() {
    const c = current();
    const now = Date.now();
    clearInterval(tick);
    if (c && now < c.ts + c.seconds * 1000) {
      display.classList.remove('done');
      display.textContent = fmt(c.ts + c.seconds * 1000 - now);
      stopBtn.hidden = false;
      tick = setInterval(render, 200);
    } else if (c && now < c.ts + c.seconds * 1000 + 5 * 60 * 1000) {
      display.classList.add('done');
      display.textContent = c.doneText;
      stopBtn.hidden = true;
      if (buzzedFor !== c.id && now < c.ts + c.seconds * 1000 + 3000) {
        buzzedFor = c.id;
        if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
      }
    } else {
      display.classList.add('done');
      display.innerHTML = `<span class="muted" style="font-size:1rem;font-weight:400">${App.esc(idle)}</span>`;
      stopBtn.hidden = true;
    }
  }

  root.addEventListener('click', e => {
    const p = e.target.closest('[data-preset]');
    if (p) {
      const preset = presets[+p.dataset.preset];
      Sync.publish({ page, slot, k: 'count', seconds: preset.seconds, doneText: preset.doneText });
    }
    if (e.target.closest('[data-stop]')) Sync.publish({ page, slot, k: 'stop' });
  });

  render();
  Sync.onEvent(e => { if (e.page === page && e.slot === slot) render(); });
}
