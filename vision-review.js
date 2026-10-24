(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const api = window.ConstructionVisionProposals;
  if (!api || !$('visionPanel')) return;
  const KEY = 'construction-ai-vision-runs-v1';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const local = location.protocol === 'http:' && ['127.0.0.1','localhost'].includes(location.hostname);
  let source = null, picture = null, crop = null, url = null, run = null, generation = 0, controller = null, start = null;
  const status = message => { $('visionStatus').textContent = message; };
  const readRuns = () => {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(value)) throw Error('Saved vision proposals are unreadable. Export or recover your project data.');
    return value;
  };
  const persist = value => {
    const list = readRuns(), i = list.findIndex(r => r.id === value.id);
    if (i < 0) list.push(value); else list[i] = value;
    localStorage.setItem(KEY, JSON.stringify(list));
  };
  function invalidate() {
    generation++;
    controller?.abort(); controller = null;
    source = picture = crop = run = start = null;
    if (url) URL.revokeObjectURL(url);
    url = null;
    $('visionImage').removeAttribute('src');
    $('visionImage').hidden = true;
    $('visionOverlay').replaceChildren();
    $('visionResults').replaceChildren();
    $('visionRun').disabled = true;
    $('visionCancel').hidden = true;
    $('visionSource').textContent = 'Choose a sheet in Library, then load it here.';
    $('visionHistory').replaceChildren();
    status('Load the selected drawing to inspect it. Existing proposals are preserved.');
  }
  function sourceIdentity() {
    return {...source, revision:$('visionRevision').value.trim() || null, crop:{...crop}};
  }
  async function loadSource() {
    invalidate();
    const token = generation;
    status('Loading the selected drawing locally…');
    try {
      const snapshot = await window.constructionAIGetVisionSource?.();
      if (!snapshot?.blob) throw Error('Import and select a drawing in Library first.');
      const hash = await crypto.subtle.digest('SHA-256', await snapshot.blob.arrayBuffer());
      if (token !== generation) return;
      url = URL.createObjectURL(snapshot.blob);
      const img = new Image();
      img.src = url;
      await img.decode();
      if (token !== generation) return;
      picture = img;
      const m = snapshot.metadata;
      source = {projectId:m.projectId, roomId:m.roomId, sheetId:m.id, sheetLabel:m.sheetId || m.id,
        page:m.pdfPage || 1, revision:m.revision || null, sourceName:m.name || 'Drawing',
        imageSha256:Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2,'0')).join(''),
        originalWidth:img.naturalWidth, originalHeight:img.naturalHeight};
      $('visionRevision').value = source.revision || '';
      crop = {x:0, y:0, width:img.naturalWidth, height:img.naturalHeight};
      $('visionImage').src = url;
      $('visionImage').hidden = false;
      $('visionOverlay').setAttribute('viewBox', `0 0 ${img.naturalWidth} ${img.naturalHeight}`);
      $('visionSource').textContent = `${source.sheetLabel} · page ${source.page} · ${source.sourceName} · ${img.naturalWidth} × ${img.naturalHeight} pixels`;
      $('visionRun').disabled = !local;
      history(); overlay();
      status(local ? 'Ready. Analyze the drawing, or drag over a smaller region for clearer detail.' :
        'Drawing loaded locally. Vision needs the computer app at http://127.0.0.1:8765. This hosted page cannot connect to it.');
    } catch (error) {
      if (token === generation) status(error.message);
    }
  }
  function overlay() {
    const svg = $('visionOverlay'); svg.replaceChildren();
    if (!source || !crop) return;
    const box = (b, color, label) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
      for (const [k,v] of Object.entries({x:b.x,y:b.y,width:b.width,height:b.height,fill:'none',stroke:color,'stroke-width':2,'vector-effect':'non-scaling-stroke'})) rect.setAttribute(k,v);
      const title = document.createElementNS('http://www.w3.org/2000/svg','title'); title.textContent = label; rect.append(title); svg.append(rect);
    };
    box(crop, '#7c3aed', 'Selected analysis region');
    if (run) run.proposals.filter(p => p.reviewState !== 'rejected').forEach((p,i) => box(p.bbox, '#0284c7', `${i+1}. ${p.label} — unverified AI proposal`));
    $('visionRegion').textContent = `Region: (${Math.round(crop.x)}, ${Math.round(crop.y)}) · ${Math.round(crop.width)} × ${Math.round(crop.height)} source pixels`;
  }
  function history() {
    const select = $('visionHistory'); select.replaceChildren();
    if (!source) return;
    const option = (text, value) => { const o = document.createElement('option'); o.textContent = text; o.value = value; select.append(o); };
    option('Saved analyses for this drawing and revision', '');
    try {
      const revision = $('visionRevision').value.trim() || null;
      readRuns().filter(r => r.source?.projectId === source.projectId && r.source?.roomId === source.roomId &&
        r.source?.sheetId === source.sheetId && r.source?.imageSha256 === source.imageSha256 && r.source?.revision === revision)
        .slice().reverse().forEach(r => option(`${new Date(r.createdAt).toLocaleString()} · ${r.proposals.length} proposals`, r.id));
      if (run) select.value = run.id;
    } catch (error) { status(error.message); }
  }
  function render() {
    const root = $('visionResults'); root.replaceChildren();
    if (!run) { overlay(); return; }
    const heading = document.createElement('p');
    heading.textContent = `AI suggests: ${run.drawingType.replaceAll('_',' ')}. ${run.summary}`;
    root.append(heading);
    const provenance = document.createElement('small');
    provenance.textContent = `Model: ${run.model} · source revision: ${run.source.revision || 'unknown'} · review proposals only; no geometry created.`;
    root.append(provenance);
    for (const warning of run.warnings) { const p = document.createElement('p'); p.textContent = warning; root.append(p); }
    if (!run.proposals.length) { const p = document.createElement('p'); p.textContent = 'No proposals returned. This does not establish that the drawing has no features.'; root.append(p); }
    run.proposals.forEach((p,i) => {
      const card = document.createElement('article'); card.className = 'knowledge-item';
      card.innerHTML = `<b>${i+1}. ${escape(p.label)}</b><p>${escape(p.kind)} · ${escape(p.reviewState.replaceAll('_',' '))}</p><p>Visible text: ${escape(p.evidenceText || 'None read')}</p><p>Missing or uncertain: ${escape(p.uncertainties.join('; ') || 'No uncertainties reported by model; still unverified.')}</p><small>Source pixels: (${Math.round(p.bbox.x)}, ${Math.round(p.bbox.y)}) · no measurement or geometry verification</small><div class="knowledge-actions"></div>`;
      const actions = card.querySelector('div');
      for (const [label,decision] of [['Keep for review','kept_for_review'],['Not correct','rejected'],['Reset review','unreviewed']]) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
        button.onclick = () => {
          try { const next = api.review(run,p.id,decision); persist(next); run=next; render(); status('Proposal review saved. Measurements and model geometry remain unverified.'); }
          catch (error) { status('Review not saved: ' + error.message); }
        };
        actions.append(button);
      }
      root.append(card);
    });
    overlay();
  }
  async function call(path, options = {}) {
    if (!local) throw Error('Open the app from the local computer server to connect a vision model.');
    const response = await fetch(`./api/vision/${path}`, {cache:'no-store',redirect:'error',...options});
    if (!(response.headers.get('content-type') || '').includes('application/json')) throw Error('Local vision server is not running at this app address.');
    const result = await response.json();
    if (!response.ok) throw Error(result.error || 'Local vision request failed.');
    return result;
  }
  function ocrContext(s) {
    try {
      const list = s.sheetId === 'A102' ? JSON.parse(localStorage.getItem('construction-ai-batch1-v1') || '{}').findings || [] :
        JSON.parse(localStorage.getItem('construction-ai-sheet-findings-v1') || '{}')[s.sheetId] || [];
      return list.filter(f => f.status !== 'rejected' && f.x >= s.crop.x && f.x <= s.crop.x+s.crop.width && f.y >= s.crop.y && f.y <= s.crop.y+s.crop.height)
        .slice(0,80).map(f => String(f.correction || f.text || '')).join('\n').slice(0,6000);
    } catch { return ''; }
  }
  async function analyze() {
    if (!source || !picture || !crop || controller) return;
    const snapshot = sourceIdentity(), image = picture, token = generation;
    const request = new AbortController(); controller = request;
    const timer = setTimeout(() => request.abort(), 260000);
    $('visionRun').disabled = true; $('visionCancel').hidden = false;
    status('Analyzing with the local vision model… Larger drawings or CPU inference can take several minutes.');
    try {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(1,1600/Math.max(snapshot.crop.width,snapshot.crop.height));
      canvas.width = Math.max(1,Math.round(snapshot.crop.width*ratio));
      canvas.height = Math.max(1,Math.round(snapshot.crop.height*ratio));
      const ctx = canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(image,snapshot.crop.x,snapshot.crop.y,snapshot.crop.width,snapshot.crop.height,0,0,canvas.width,canvas.height);
      snapshot.sentWidth = canvas.width; snapshot.sentHeight = canvas.height;
      const response = await call('analyze',{method:'POST',signal:request.signal,headers:{'Content-Type':'application/json'},
        body:JSON.stringify({image:canvas.toDataURL('image/png').split(',')[1],ocrContext:ocrContext(snapshot)})});
      if (token !== generation || request.signal.aborted) return;
      const next = api.buildRun(response,snapshot,crypto.randomUUID());
      // Never replace prior runs or their human decisions when analyzing again.
      try { persist(next); } catch (error) { run=next; render(); status('Analysis completed but could not save: '+error.message+'. Export this result before leaving.'); return; }
      run=next; render(); history();
      status(`${run.proposals.length} unverified AI proposals saved locally. No scale, accepted correction, or 3D element was changed.`);
    } catch (error) {
      if (token === generation) status(error.name === 'AbortError' ? 'Analysis cancelled or timed out. Previous proposals are preserved. The model may still finish its current request.' : error.message);
    } finally {
      clearTimeout(timer);
      if (controller === request) { controller=null; $('visionCancel').hidden=true; $('visionRun').disabled=!source || !local; }
    }
  }
  function point(event) {
    const rect = $('visionCanvas').getBoundingClientRect();
    return {x:Math.max(0,Math.min(source.originalWidth,(event.clientX-rect.left)/rect.width*source.originalWidth)),
      y:Math.max(0,Math.min(source.originalHeight,(event.clientY-rect.top)/rect.height*source.originalHeight))};
  }
  $('visionCanvas').addEventListener('pointerdown', event => {
    if (!source || controller) return;
    start = point(event); $('visionCanvas').setPointerCapture(event.pointerId);
  });
  $('visionCanvas').addEventListener('pointermove', event => {
    if (!start || !source) return;
    const p=point(event); crop={x:Math.min(start.x,p.x), y:Math.min(start.y,p.y), width:Math.abs(p.x-start.x), height:Math.abs(p.y-start.y)};
    run=null; render();
  });
  const end = () => {
    if (!start || !source) return;
    if (crop.width < 8 || crop.height < 8) crop={x:0,y:0,width:source.originalWidth,height:source.originalHeight};
    start=null; overlay();
  };
  $('visionCanvas').addEventListener('pointerup',end);
  $('visionCanvas').addEventListener('pointercancel',end);
  $('visionLoad').onclick=loadSource;
  $('visionRun').onclick=analyze;
  $('visionCancel').onclick=()=>controller?.abort();
  $('visionFullPage').onclick=()=>{if (!source || controller) return; crop={x:0,y:0,width:source.originalWidth,height:source.originalHeight}; run=null; render();};
  $('visionRevision').onchange=()=>{
    generation++; controller?.abort(); controller=null; $('visionCancel').hidden=true;
    $('visionRun').disabled=!source || !local; run=null; render(); history();
    status('Revision changed. Previous analyses remain saved under their original revision.');
  };
  $('visionHistory').onchange=()=>{
    if (!source || controller) return;
    try { const next=readRuns().find(r=>r.id===$('visionHistory').value); if (!next) return;
      // Recheck complete source scope instead of trusting a selector value.
      const s=next.source;
      if (s.projectId!==source.projectId || s.roomId!==source.roomId || s.sheetId!==source.sheetId || s.imageSha256!==source.imageSha256 || s.revision!==($('visionRevision').value.trim()||null)) throw Error('Saved analysis belongs to a different source.');
      api.sourceKey(s); run=next; crop={...s.crop}; render(); status('Saved proposals loaded. They remain unverified.');
    } catch(error) {status(error.message);}
  };
  $('visionCheck').onclick=async()=>{
    try { const r=await call('status'); status(r.ready ? `Local model ready: ${r.model}.` : `Install the model on this computer: ollama pull ${r.model}`); }
    catch(error) {status(error.message);}
  };
  $('visionExport').onclick=()=>{
    if (!run) {status('Run an analysis or select a saved one first.');return;}
    const href=URL.createObjectURL(new Blob([JSON.stringify(run,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=href;a.download='site-resolved-vision-proposals.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
  };
  window.addEventListener('construction-room-change',invalidate);
  window.addEventListener('construction-drawing-change',invalidate);
  invalidate();
})();
