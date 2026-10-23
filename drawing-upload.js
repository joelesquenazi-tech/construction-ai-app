(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const dialog = $('uploadDrawingDialog'), form = $('quickUploadForm'), input = $('quickDrawingFiles');
  const save = $('saveQuickDrawings'), cancel = $('cancelDrawingUpload'), close = $('closeDrawingUpload');
  let pending = [], busy = false, saved = false, trigger;
  const label = type => ({ 'floor-plan': 'Floor plan', elevation: 'Elevation', other: 'Other' })[type];
  function fileSelection() {
    pending = Array.from(input.files || []).map(file => ({ file, row: null }));
    $('quickUploadResults').replaceChildren();
    $('quickUploadStatus').textContent = '';
    $('quickFileSummary').textContent = pending.length ? `${pending.length} file(s) selected. Choose a drawing type below.` : 'Choose JPG, PNG or PDF files.';
    $('quickNameLabel').hidden = pending.length > 1;
    $('quickDrawingName').disabled = pending.length > 1;
    $('quickPdfOptions').hidden = !pending.some(item => window.constructionAIPdf.isPdf(item.file));
    save.textContent = pending.length > 1 ? 'Save drawings' : 'Save drawing';
    save.disabled = !pending.length;
  }
  function open(event) {
    trigger = event.currentTarget;
    form.reset(); input.required = true; pending = []; saved = false;
    $('quickUploadResults').replaceChildren(); $('quickUploadStatus').textContent = '';
    cancel.textContent = 'Cancel'; fileSelection();
    const destination = window.constructionAIProjects.label();
    $('uploadDestination').textContent = `Save to ${destination.project} / ${destination.room}`;
    dialog.showModal();
    // Stay in this user gesture so Files opens directly on iPad as well.
    input.click();
  }
  $('uploadDrawings').onclick = open;
  $('libraryUploadDrawings').onclick = open;
  input.onchange = fileSelection;
  const dismiss = () => { if (!busy) dialog.close(); };
  cancel.onclick = close.onclick = dismiss;
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => {
    if (saved) window.constructionAIShowTab('drawings');
    (saved ? $('uploadDrawings') : trigger)?.focus();
  });
  function setBusy(value) {
    busy = value;
    for (const control of form.elements) control.disabled = value;
    close.disabled = value;
    dialog.setAttribute('aria-busy', String(value));
    if (!value) { $('quickDrawingName').disabled = pending.length > 1; save.disabled = !pending.length; }
  }
  form.onsubmit = async event => {
    event.preventDefault();
    if (busy || !pending.length) return;
    if (pending.length > 20) { $('quickUploadStatus').textContent = 'Choose up to 20 files at a time.'; return; }
    const type = new FormData(form).get('quickDrawingType');
    if (!label(type)) { $('quickUploadStatus').textContent = 'Choose Floor plan, Elevation or Other.'; return; }
    if (!saved && window.constructionAIHasUnsavedEdits?.() && !window.confirm('You have unsaved edits on the current drawing or records. Save them before uploading and switching drawings. Continue anyway?')) { $('quickUploadStatus').textContent = 'Upload cancelled. Save your edits first.'; return; }
    const name = pending.length === 1 ? $('quickDrawingName').value.trim() : '';
    const pages = $('quickPdfPages').value || 'all';
    const scope = JSON.stringify(window.constructionAIProjects.current());
    setBusy(true);
    const failed = []; let sheets = 0;
    try {
      for (const [index, item] of pending.entries()) {
        $('quickUploadStatus').textContent = `Saving drawing ${index + 1} of ${pending.length} on this device…`;
        if (!item.row) { item.row = document.createElement('li'); $('quickUploadResults').append(item.row); }
        try {
          if (scope !== JSON.stringify(window.constructionAIProjects.current())) throw Error('Project or room changed. Choose the destination again.');
          const result = await window.constructionAIUploadDrawing(item.file, { drawingType: type, name, pages });
          if (!result) throw Error('Import was cancelled.');
          sheets += result.count; saved = true;
          item.row.textContent = `${item.file.name} — ${label(type)} · ${result.count} sheet(s) saved`;
          item.row.dataset.error = 'false';
        } catch (error) {
          failed.push(item); item.row.textContent = `${item.file.name} — ${error.message}`;
          item.row.dataset.error = 'true';
        }
      }
      pending = failed;
      // Keep only failed files pending so Retry cannot duplicate successful uploads.
      input.required = pending.length === 0;
      $('quickUploadStatus').textContent = `${sheets} sheet(s) saved. ${failed.length ? `${failed.length} file(s) need attention. See the messages below and retry.` : 'Ready to view your drawings.'}`;
      save.textContent = failed.length ? 'Retry failed files' : 'Saved'; cancel.textContent = saved ? 'Done' : 'Cancel';
    } finally { setBusy(false); }
  };
})();
