/*
  Secret pick, shared reveal.
  Each of you taps an option. Your partner only sees THAT you picked, not WHAT,
  until you've both chosen. Then both picks are revealed on both phones at once.
  If they differ, you can settle it together (or flip a coin that both phones see).
*/
function mountChoice(root, { page, options, layout = 'grid', onDecided }) {
  const byId = id => options.find(o => o.id === id);
  let lastDecided;

  function derive(events) {
    let picks = {};
    let final = null;
    for (const e of events) {
      if (e.k === 'reset') { picks = {}; final = null; }
      else if (e.k === 'pick') { picks[e.who] = e.opt; final = null; }
      else if (e.k === 'final') { final = e.opt; }
    }
    const both = CONFIG.people.every(p => picks[p]);
    const match = both && picks[CONFIG.people[0]] === picks[CONFIG.people[1]];
    return { picks, both, decided: match ? picks[CONFIG.people[0]] : final };
  }

  root.innerHTML = `
    <div class="opts ${layout}" role="group" aria-label="Options">
      ${options.map(o => `
        <button class="opt" type="button" data-opt="${o.id}" aria-pressed="false">
          ${o.img ? `<img src="${o.img}" alt="" loading="lazy">` : `<i class="ph ${o.icon}"></i>`}
          <span class="txt">
            <span class="t">${App.esc(o.title)}</span>
            <span class="d">${App.esc(o.short)}</span>
          </span>
          <i class="ph-fill ph-check-circle tick" aria-hidden="true"></i>
        </button>`).join('')}
    </div>
    <div class="choice-status" data-status></div>
    <div class="panel reveal-box" data-reveal hidden style="margin-top:18px"></div>`;

  const statusEl = root.querySelector('[data-status]');
  const revealEl = root.querySelector('[data-reveal]');
  let wasBoth = null;

  function render() {
    const me = App.me();
    const partner = App.partner();
    const st = derive(Sync.events(page));
    const mine = st.picks[me];

    root.querySelectorAll('[data-opt]').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.opt === mine));
      b.disabled = st.both;
    });

    if (!st.both) {
      statusEl.innerHTML = `
        <p>${mine
          ? `<i class="ph ph-check-circle"></i> You picked <b>${App.esc(byId(mine).title)}</b>.`
          : `<i class="ph ph-hand-pointing"></i> Tap your favorite.`}</p>
        <p class="muted">${st.picks[partner]
          ? `<i class="ph ph-lock-simple"></i> ${App.esc(partner)} has picked (secret).`
          : `<i class="ph ph-hourglass"></i> ${App.esc(partner)} is choosing.`}</p>`;
      revealEl.hidden = true;
      wasBoth = false;
    } else {
      statusEl.innerHTML = '';
      revealEl.hidden = false;
      const [a, b] = CONFIG.people;
      const pa = byId(st.picks[a]);
      const pb = byId(st.picks[b]);
      const matched = pa.id === pb.id;
      const animate = wasBoth === false && !App.reducedMotion();
      revealEl.innerHTML = `
        <div class="picks ${animate ? 'reveal' : ''}">
          ${[[a, pa], [b, pb]].map(([who, o]) => `
          <div class="pick">
            ${o.img ? `<img src="${o.img}" alt="">` : ''}
            <div class="who">${App.esc(who)} picked</div>
            <div class="what">${o.img ? '' : `<i class="ph ${o.icon}"></i>`}${App.esc(o.title)}</div>
          </div>`).join('')}
        </div>
        ${matched
          ? `<p class="verdict">Same pick!</p>`
          : st.decided
            ? `<p class="verdict">Going with ${App.esc(byId(st.decided).title)}.</p>`
            : `<p>Different picks. Choose one, or flip a coin.</p>
               <div class="actions">
                 <button class="btn btn-ghost" data-final="${pa.id}">${App.esc(pa.title)}</button>
                 <button class="btn btn-ghost" data-final="${pb.id}">${App.esc(pb.title)}</button>
                 <button class="btn btn-primary" data-flip><i class="ph ph-coin"></i> Flip a coin</button>
               </div>`}
        <div class="actions"><button class="btn-link" data-reset>Choose again</button></div>`;
      wasBoth = true;
    }

    if (st.decided !== lastDecided) {
      lastDecided = st.decided;
      onDecided && onDecided(st.decided ? byId(st.decided) : null);
    }
  }

  root.addEventListener('click', e => {
    const opt = e.target.closest('[data-opt]');
    if (opt && !opt.disabled) {
      Sync.publish({ page, k: 'pick', opt: opt.dataset.opt });
      return;
    }
    const fin = e.target.closest('[data-final]');
    if (fin) { Sync.publish({ page, k: 'final', opt: fin.dataset.final }); return; }
    if (e.target.closest('[data-flip]')) {
      const st = derive(Sync.events(page));
      const two = CONFIG.people.map(p => st.picks[p]);
      Sync.publish({ page, k: 'final', opt: two[Math.random() < 0.5 ? 0 : 1], flip: true });
      return;
    }
    if (e.target.closest('[data-reset]')) {
      if (confirm('Clear both picks and choose again?')) Sync.publish({ page, k: 'reset' });
    }
  });

  render();
  Sync.onEvent(e => { if (e.page === page) render(); });
  document.addEventListener('who-changed', render);
}
