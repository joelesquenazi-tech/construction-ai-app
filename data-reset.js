(() => {
  'use strict';
  const STATE = 'construction-ai-data-reset-v1';
  const AUTH = 'construction-ai-data-reset-authorized-v1';
  const generation = localStorage.getItem('construction-ai-data-generation-v1');
  window.addEventListener('pageshow', event => {
    if (event.persisted && localStorage.getItem('construction-ai-data-generation-v1') !== generation) location.reload();
  });
  const dialog = document.getElementById('clearDataDialog');
  const input = document.getElementById('clearDataConfirmation');
  const confirm = document.getElementById('confirmClearData');
  const button = document.getElementById('clearAllData');
  const error = document.getElementById('clearDataError');
  button.onclick = () => {
    input.value = ''; error.textContent = ''; confirm.disabled = true;
    dialog.showModal(); input.focus();
  };
  input.oninput = () => { confirm.disabled = input.value.trim() !== 'CLEAR'; };
  document.getElementById('cancelClearData').onclick = () => { dialog.close(); button.focus(); };
  confirm.onclick = () => {
    if (input.value.trim() !== 'CLEAR') return;
    try {
      // Destruction runs in a separate document, after application scripts and
      // their pending in-memory work have been unloaded.
      sessionStorage.setItem(AUTH, 'yes');
      location.assign(new URL('./reset.html', document.baseURI).href);
    } catch (cause) { error.textContent = 'Could not start reset: ' + cause.message; }
  };
  function joinReset() {
    if (!new URLSearchParams(location.search).has('resumeReset') && localStorage.getItem(STATE) === 'running') { sessionStorage.setItem('construction-ai-data-reset-waiting-v1', 'yes'); location.replace(new URL('./reset.html', document.baseURI).href); }
  }
  window.addEventListener('storage', event => { if (event.key === STATE && event.newValue === 'running') joinReset(); });
  joinReset();
})();
