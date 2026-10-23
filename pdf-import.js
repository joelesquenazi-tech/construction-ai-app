(() => {
  'use strict';
  const root = new URL('./vendor/pdfjs/', document.baseURI);
  let engine, maps;
  const isPdf = file => file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '');
  async function loadEngine() {
    if (!engine) engine = import(new URL('pdf.min.mjs', root).href).catch(error => { engine = null; throw error; });
    const pdfjs = await engine;
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.mjs', root).href;
    return pdfjs;
  }
  class LocalBinaryData {
    constructor(options) { this.options = options; }
    async fetch({ kind, filename }) {
      if(kind !== "cMapUrl") {
        const response = await fetch(this.options[kind] + filename);
        if(!response.ok) throw Error("PDF rendering asset unavailable. Refresh App while online.");
        return new Uint8Array(await response.arrayBuffer());
      }
      if (!maps) maps = fetch(new URL('cmaps.json', root)).then(response => {
        if (!response.ok) throw Error('PDF fonts unavailable. Refresh App while online.');
        return response.json();
      }).catch(error => { maps = null; throw error; });
      const encoded = (await maps)[filename];
      if (!encoded) throw Error('This PDF uses an unsupported character map.');
      return Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    }
  }
  function pagesFrom(value, total) {
    const text = String(value || 'all').trim().toLowerCase();
    if (text === 'all') {
      if (total > 20) throw Error(`This PDF has ${total} pages. Import up to 20 at a time using PDF pages (for example 1-20).`);
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = new Set();
    for (const part of text.split(',')) {
      const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!match) throw Error('Enter PDF pages such as all, 1, or 1-3,5.');
      const start = Number(match[1]), end = Number(match[2] || match[1]);
      if (start < 1 || end < start || end > total) throw Error(`Choose pages between 1 and ${total}.`);
      if (end - start > 20) throw Error('Import up to 20 PDF pages at a time.');
      for (let page = start; page <= end; page++) pages.add(page);
    }
    if (pages.size > 20) throw Error('Import up to 20 PDF pages at a time.');
    return [...pages].sort((a, b) => a - b);
  }
  async function prepare(file, selection = 'all', progress = () => {}) {
    if (file.size > 40 * 1024 * 1024) throw Error('Choose a PDF up to 40 MB.');
    const pdfjs = await loadEngine();
    const task = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false,
      useWorkerFetch: false, BinaryDataFactory: LocalBinaryData,
      standardFontDataUrl: new URL('standard_fonts/', root).href,
      wasmUrl: new URL('wasm/', root).href,
      enableXfa: false, stopAtErrors: true
    });
    task.onPassword = () => task.destroy();
    try {
      const document = await task.promise;
      const pages = pagesFrom(selection, document.numPages), result = [];
      for (const number of pages) {
        progress(`Rendering PDF page ${number} of ${document.numPages} on this device…`);
        const page = await document.getPage(number), natural = page.getViewport({ scale: 1 });
        const scale = Math.min(2400 / Math.max(natural.width, natural.height), Math.sqrt(4000000 / (natural.width * natural.height)));
        const viewport = page.getViewport({ scale });
        const canvas = window.document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        try {
          await page.render({ canvasContext: canvas.getContext('2d'), viewport, background: 'white' }).promise;
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          if (!blob) throw Error('Not enough memory to render this PDF. Import fewer pages.');
          result.push({ blob, width: canvas.width, height: canvas.height, page: number, pageCount: document.numPages });
        } finally { canvas.width = canvas.height = 0; page.cleanup(); }
      }
      return result;
    } catch (error) {
      if (/password|destroyed/i.test(error.message || '')) throw Error('Password-protected PDFs are not supported. Use an unlocked copy.');
      throw error;
    } finally { await task.destroy(); }
  }
  window.constructionAIPdf = { isPdf, prepare };
})();
