(() => {
  'use strict';
  const panel = document.getElementById('settingsPanel');
  const open = document.getElementById('openSettings');
  const refresh = document.getElementById('settingsRefresh');
  const status = document.getElementById('refreshStatus');
  const close = document.getElementById('closeSettings');
  let busy = false;
  const show = () => { if (!panel.open) panel.showModal(); };
  open.onclick = show;
  close.onclick = () => { panel.close(); open.focus(); };
  panel.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  function report(message, error = false) {
    status.textContent = message;
    status.dataset.error = String(error);
  }
  function deadline(promise) {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('The update check timed out. Try again when online.')), 20000);
    })]).finally(() => clearTimeout(timer));
  }
  // Wait for both activation and control, so reload cannot reuse the previous shell.
  function takeControl(worker) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('The update could not take control. Close and reopen the app, then try again.')), 20000);
      const finish = error => {
        clearTimeout(timer);
        worker.removeEventListener('statechange', check);
        navigator.serviceWorker.removeEventListener('controllerchange', check);
        error ? reject(error) : resolve();
      };
      const check = () => {
        if (worker.state === 'redundant') finish(new Error('The update could not install. Check your connection and try again.'));
        else if (worker.state === 'activated' && navigator.serviceWorker.controller === worker) finish();
        else if (worker.state === 'installed') worker.postMessage({ type: 'SKIP_WAITING' });
      };
      worker.addEventListener('statechange', check);
      navigator.serviceWorker.addEventListener('controllerchange', check);
      check();
    });
  }
  async function runRefresh() {
    show();
    if (busy) return;
    if (window.constructionAIHasUnsavedEdits?.() &&
        !window.confirm('You have unsaved edits. Refreshing will discard them. Cancel to save your edits first. Saved reviews, records, and drawings will be kept. Continue?')) {
      report('Refresh cancelled. Save your edits before trying again.');
      return;
    }
    busy = true;
    refresh.disabled = close.disabled = true;
    panel.setAttribute('aria-busy', 'true');
    report('Checking for an app update…');
    try {
      if (!('serviceWorker' in navigator) || !window.isSecureContext) throw new Error('App updates require a browser with service worker support and a secure HTTPS connection.');
      if (!navigator.onLine) throw new Error('You are offline. Connect to the internet and try again.');
      await deadline(window.constructionAIWaitForDrawingSave?.() || Promise.resolve());
      const registration = await deadline(navigator.serviceWorker.getRegistration('./').then(reg =>
        reg || navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })));
      await deadline(registration.update());
      const worker = registration.installing || registration.waiting || registration.active;
      if (!worker) throw new Error('No app service worker is available. Try again.');
      report('Preparing the latest available version…');
      await takeControl(worker);
      report('Update check complete. Reloading app…');
      window.location.reload();
    } catch (error) {
      report(`Refresh failed: ${error.message || 'Unknown error'}. Your saved data has not been cleared.`, true);
    } finally {
      busy = false;
      refresh.disabled = close.disabled = false;
      panel.removeAttribute('aria-busy');
    }
  }
  refresh.onclick = runRefresh;
  const noticeRefresh = document.getElementById('refreshApp');
  if (noticeRefresh) noticeRefresh.onclick = runRefresh;
})();
