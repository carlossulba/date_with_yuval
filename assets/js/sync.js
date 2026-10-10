/*
  Tiny real-time sync between the two phones, with no server of our own.

  Every tap becomes a small event that is published to a private topic on ntfy.sh
  (a free, open-source publish/subscribe service). Both phones listen to that topic,
  keep the full list of events, and each page works out its state from that list.
  Events are also kept in localStorage, so a page still works offline on one phone.
*/
const Sync = (() => {
  const BASE = 'https://ntfy.sh/';
  const topic = CONFIG.room;
  const storeKey = 'cita:log:' + topic;

  const log = [];
  const ids = new Set();
  const listeners = [];
  const statusListeners = [];
  let status = 'connecting';
  let source = null;
  let retry = null;

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  function add(e) {
    if (!e || !e.id || ids.has(e.id)) return false;
    ids.add(e.id);
    log.push(e);
    log.sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1));
    return true;
  }

  function save() {
    try { localStorage.setItem(storeKey, JSON.stringify(log.slice(-500))); } catch {}
  }

  function receive(e) {
    if (!add(e)) return;
    save();
    listeners.forEach(fn => fn(e));
  }

  function setStatus(s) {
    if (s === status) return;
    status = s;
    statusListeners.forEach(fn => fn(s));
  }

  function connect() {
    clearTimeout(retry);
    if (source) source.close();
    // since=12h replays what already happened today, so a late or reloaded phone catches up.
    source = new EventSource(BASE + encodeURIComponent(topic) + '/sse?since=12h');
    source.onopen = () => setStatus('online');
    source.onmessage = ev => {
      try {
        const d = JSON.parse(ev.data);
        if (d.event !== 'message') return;
        receive(JSON.parse(d.message));
      } catch {}
    };
    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        setStatus('offline');
        retry = setTimeout(connect, 4000);
      } else {
        setStatus('connecting');
      }
    };
  }

  function publish(data) {
    const e = { ...data, id: uid(), ts: Date.now(), who: data.who || App.me() };
    receive(e);
    fetch(BASE + encodeURIComponent(topic), { method: 'POST', body: JSON.stringify(e) })
      .then(r => { if (!r.ok) throw new Error(r.status); })
      .catch(() => setStatus('offline'));
    return e;
  }

  try { JSON.parse(localStorage.getItem(storeKey) || '[]').forEach(add); } catch {}
  connect();
  window.addEventListener('online', connect);

  return {
    publish,
    events: page => log.filter(e => e.page === page),
    onEvent: fn => listeners.push(fn),
    onStatus: fn => { statusListeners.push(fn); fn(status); },
  };
})();
