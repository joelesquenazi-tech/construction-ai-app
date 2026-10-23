(() => {
  'use strict';
  const PREFIX = 'construction-ai-';
  const STATE = PREFIX + 'data-reset-v1';
  const AUTH = PREFIX + 'data-reset-authorized-v1';
  const status = document.getElementById('resetStatus');
  const retry = document.getElementById('retryReset');
  const back = document.getElementById('returnToApp');
  const waiting = new URLSearchParams(location.search).has('waiting') || sessionStorage.getItem(PREFIX + 'data-reset-waiting-v1') === 'yes';
  sessionStorage.removeItem(PREFIX + 'data-reset-waiting-v1');
  let authorized = false;
  try { authorized = !waiting && sessionStorage.getItem(AUTH) === 'yes'; } catch (cause) { status.textContent = 'Browser storage is unavailable: ' + cause.message; back.hidden = false; return; }
  // A direct visit/bookmark to this page must never clear data.
  sessionStorage.removeItem(AUTH);
  let busy = false;
  function clearKeys(storage, keepState = false) {
    const keys = [];
    for (let index = 0; index < storage.length; index++) keys.push(storage.key(index));
    for (const key of keys) if (key?.startsWith(PREFIX) && !(keepState && key === STATE)) storage.removeItem(key);
  }
  function removeDatabase(name) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || Error('Could not clear ' + name));
      request.onblocked = () => { status.textContent = 'Close other Construction AI tabs or windows to finish clearing drawings and model files. Clearing will continue automatically.'; };
    });
  }
  async function reset() {
    if (!authorized || busy) return;
    busy = true; retry.hidden = true; back.hidden = true;
    try {
      // Other updated app windows unload their scripts and release database
      // connections before deletion, so stale state cannot be saved afterward.
      localStorage.setItem(STATE, 'running');
      status.textContent = 'Clearing drawings, PDF originals, and model files…';
      const names = new Set(['construction-ai-private-drawings', 'construction-ai-model-files-v1']);
      if (typeof indexedDB.databases === 'function') {
        const databases = await indexedDB.databases();
        for (const database of databases) if (database.name?.startsWith(PREFIX)) names.add(database.name);
      }
      for (const name of names) await removeDatabase(name);
      status.textContent = 'Clearing projects, reviews, records, calibration, and preferences…';
      clearKeys(localStorage, true); clearKeys(sessionStorage);
      // Suppress legacy demo-sheet migration: a fresh library should be empty.
      localStorage.setItem('construction-ai-library-migrated-v1', 'yes');
      localStorage.setItem('construction-ai-data-generation-v1', crypto.randomUUID());
      localStorage.removeItem(STATE);
      status.textContent = 'App data cleared. Starting fresh…';
      location.replace(new URL('./', document.baseURI).href);
    } catch (cause) {
      try { localStorage.setItem(STATE, 'error'); } catch {}
      status.textContent = 'Reset could not finish: ' + cause.message + '. Some data may already have been removed. Retry to finish; the app code and offline installation are unchanged.';
      retry.hidden = false; back.hidden = false;
    } finally { busy = false; }
  }
  retry.onclick = reset;
  function checkOtherReset() {
    const state = localStorage.getItem(STATE);
    if (!state) { clearKeys(sessionStorage); location.replace(new URL('./', document.baseURI).href); }
    else if (state === 'error') { status.textContent = 'Reset could not finish in the other window. Return there and retry. Some data may already have been removed.'; back.hidden = false; back.href = './?resumeReset=1'; }
    else { status.textContent = 'App data is being cleared in another window. This window will reopen when it finishes. If that window was closed, return to the app and start Clear all app data again.'; back.hidden = false; back.href = './?resumeReset=1'; }
  }
  if (authorized) reset();
  else if (waiting) {
    window.addEventListener('storage', event => { if (event.key === STATE) checkOtherReset(); });
    checkOtherReset();
  } else { status.textContent = 'Nothing has been cleared. Open Settings → Clear all app data to start a reset.'; back.hidden = false; }
})();
