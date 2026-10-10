/*
  Morning: the reflection questions, revealed one at a time.
  A question only appears once BOTH of you tap "ready", and then it appears on both phones at once.
  Notes typed here stay private on each phone.
*/
const PAGE = 'morning';

const QUESTIONS = [
  { s: 'A letter about us', t: 'What do I like most about you?' },
  { s: 'A letter about us', t: 'What is my favorite memory with you?' },
  { s: 'A letter about us', t: 'What would I like to experience with you this year?' },
  { s: 'The past', t: 'How has my connection with spirituality, faith or my deepest principles been this year?' },
  { s: 'The past', t: 'Whom did I hurt this year (with words, actions or silence), and to whom do I owe a sincere apology?' },
  { s: 'The past', t: 'Which moments of this past year make me proud, and which make me ashamed?' },
  { s: 'The past', t: 'If the year that just ended were a book, what would the titles of its hardest chapters be, and what did they teach me?' },
  { s: 'The present', t: 'What is my current relationship with the transcendent, with my spirituality and with my core values?' },
  { s: 'The present', t: 'What legacy or kind of energy do I bring to the world in my day-to-day life?' },
  { s: 'The present', t: 'If today my fate is sealed in the Book of Life, am I living a life that is truly worthwhile, or am I living on autopilot?' },
  { s: 'The present', t: 'Which toxic habits, attitudes or thoughts do I need to free myself from today?' },
  { s: 'The future', t: 'What are my most meaningful spiritual projects and goals for this new year?' },
  { s: 'The future', t: 'How can I contribute more actively to the people and the world around me?' },
  { s: 'The future', t: 'What promise do I make to myself today for the coming year?' },
  { s: 'The future', t: 'What word or phrase will guide my actions so that I live a year that is more awake, more aware and full of meaning?' },
];
const N = QUESTIONS.length;

// Step -1 is the intro, 0..N-1 are questions, N is the closing.
function derive(events) {
  let q = -1;
  let ready = {};
  for (const e of events) {
    if (e.k === 'reset') { q = -1; ready = {}; }
    else if (e.k === 'goto') { q = Math.max(-1, Math.min(N, e.q)); ready = {}; }
    else if (e.k === 'ready' && e.q === q) {
      ready[e.who] = true;
      if (CONFIG.people.every(p => ready[p])) { q = Math.min(N, q + 1); ready = {}; }
    }
    else if (e.k === 'unready' && e.q === q) { delete ready[e.who]; }
  }
  return { q, ready };
}

const stage = document.getElementById('stage');
const controls = document.getElementById('controls');
const overlay = document.getElementById('overlay');
const overlayN = document.getElementById('overlayN');

const noteKey = q => `cita:notes:${App.me()}:${q}`;
const getNote = q => { try { return localStorage.getItem(noteKey(q)) || ''; } catch { return ''; } };
const setNote = (q, v) => { try { localStorage.setItem(noteKey(q), v); } catch {} };

let shownQ = null;
let counting = false;
let targetQ = null;

function progressBar(q) {
  return `<div class="progress" aria-hidden="true">${QUESTIONS.map((x, i) => {
    const gap = i > 0 && QUESTIONS[i - 1].s !== x.s ? ' gap' : '';
    return `<span class="${i <= q ? 'done' : ''}${gap}"></span>`;
  }).join('')}</div>`;
}

function drawStep(q, animate) {
  shownQ = q;
  const cls = animate ? 'reveal' : '';
  if (q < 0) {
    stage.innerHTML = `
      <div class="${cls}" style="display:grid;gap:14px">
        <h2>Before we begin</h2>
        <p>Follow whatever plan you have for Yom Kippur, and find a quiet moment for this. There are ${N} questions: three for a letter about us, then a personal reflection on the past, the present and the future.</p>
        <p>Each question appears on both phones at the same time, only once you've <b>both</b> tapped ready. Write your answers privately below each one, then share whatever you feel like.</p>
      </div>`;
  } else if (q >= N) {
    const answers = QUESTIONS.map((x, i) => ({ ...x, a: getNote(i).trim() })).filter(x => x.a);
    stage.innerHTML = `
      <div class="${cls}" style="display:grid;gap:16px">
        <h2>To close</h2>
        <p class="q-text">Write your guiding word or phrase beautifully on a piece of card, and leave it somewhere visible as a reminder for the new year.</p>
        <div class="section" style="margin-top:18px">
          <h3>My answers</h3>
          ${answers.length
            ? `<div class="answers">${answers.map(x => `<div><div class="a-q">${App.esc(x.t)}</div><div class="a-a">${App.esc(x.a)}</div></div>`).join('')}</div>`
            : `<p class="muted">You didn't write anything down here, and that's fine. The best answers are sometimes the ones said out loud.</p>`}
        </div>
      </div>`;
  } else {
    const x = QUESTIONS[q];
    stage.innerHTML = `
      ${progressBar(q)}
      <div class="q-meta"><b>${App.esc(x.s)}</b><span>Question ${q + 1} of ${N}</span></div>
      <p class="q-text ${cls}">${App.esc(x.t)}</p>
      <div class="notes">
        <label for="note">My answer</label>
        <textarea id="note" placeholder="Write freely, nobody else can see this."></textarea>
        <span class="helper">Saved only on this phone.</span>
      </div>`;
    const ta = stage.querySelector('#note');
    ta.value = getNote(q);
    ta.addEventListener('input', () => setNote(q, ta.value));
  }
}

function drawControls(st) {
  const me = App.me();
  const partner = App.partner();
  const q = st.q;

  if (q >= N) {
    controls.innerHTML = `
      <div class="actions">
        <button class="btn btn-primary" data-act="copy"><i class="ph ph-copy"></i> Copy my answers</button>
        <a class="btn btn-ghost" href="midday.html">On to midday <i class="ph ph-arrow-right"></i></a>
      </div>
      <div class="actions">
        <button class="btn-link" data-act="back">Back to the last question</button>
        <button class="btn-link" data-act="reset">Start over</button>
      </div>`;
    return;
  }

  const iAmReady = !!st.ready[me];
  const label = q < 0 ? "I'm ready to begin" : q === N - 1 ? "I'm ready to finish" : 'Ready for the next one';
  controls.innerHTML = `
    <div class="actions">
      <button class="btn ${iAmReady ? 'waiting' : 'btn-primary'}" data-act="${iAmReady ? 'unready' : 'ready'}">
        ${iAmReady ? `<i class="ph ph-hourglass"></i> Waiting for ${App.esc(partner)}` : `<i class="ph ph-check"></i> ${label}`}
      </button>
      <span class="partner-line ${st.ready[partner] ? 'ready' : ''}">
        ${st.ready[partner]
          ? `<i class="ph ph-check-circle"></i> ${App.esc(partner)} is ready`
          : `<i class="ph ph-pencil-simple-line"></i> ${App.esc(partner)} isn't ready yet`}
      </span>
    </div>
    <div class="actions">
      ${q > 0 ? '<button class="btn-link" data-act="back">Previous question</button>' : ''}
      ${q >= 0 ? `<button class="btn-link" data-act="skip">Skip waiting</button>` : ''}
    </div>`;
}

controls.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const st = derive(Sync.events(PAGE));
  switch (b.dataset.act) {
    case 'ready': Sync.publish({ page: PAGE, k: 'ready', q: st.q }); break;
    case 'unready': Sync.publish({ page: PAGE, k: 'unready', q: st.q }); break;
    case 'skip': Sync.publish({ page: PAGE, k: 'goto', q: st.q + 1 }); break;
    case 'back': Sync.publish({ page: PAGE, k: 'goto', q: Math.max(0, st.q - 1) }); break;
    case 'reset':
      if (confirm('Start the questions over for both of you? Your notes stay saved.')) Sync.publish({ page: PAGE, k: 'reset' });
      break;
    case 'copy': copyAnswers(b); break;
  }
});

function copyAnswers(btn) {
  const text = QUESTIONS.map((x, i) => `${x.t}\n${getNote(i).trim() || '-'}`).join('\n\n');
  navigator.clipboard.writeText(text).then(
    () => { btn.innerHTML = '<i class="ph ph-check"></i> Copied'; },
    () => { btn.textContent = 'Could not copy'; }
  );
}

// 3, 2, 1 on both phones, then the question fades in.
function runCountdown(done) {
  overlay.hidden = false;
  let n = 3;
  const step = () => {
    if (n === 0) { overlay.hidden = true; done(); return; }
    overlayN.textContent = n;
    overlayN.style.animation = 'none';
    void overlayN.offsetWidth;
    overlayN.style.animation = '';
    n--;
    setTimeout(step, 800);
  };
  step();
}

function render() {
  const st = derive(Sync.events(PAGE));
  drawControls(st);
  targetQ = st.q;
  if (counting) return;
  if (shownQ === null || App.reducedMotion() || targetQ < shownQ || targetQ === -1) {
    if (targetQ !== shownQ) drawStep(targetQ, shownQ !== null);
    return;
  }
  if (targetQ > shownQ) {
    counting = true;
    runCountdown(() => {
      counting = false;
      drawStep(targetQ, true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

App.mountHeader(document.getElementById('header'));
App.requireMe(() => {
  render();
  Sync.onEvent(render);
  document.addEventListener('who-changed', () => { shownQ = null; render(); });
});
