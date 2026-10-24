/* Vision produces source-linked review proposals, never canonical geometry. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ConstructionVisionProposals = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const KINDS = ['wall','door','window','ceiling','cove','soffit','reveal','dimension','room_label','detail_reference','other'];
  const TYPES = ['floor_plan','reflected_ceiling_plan','elevation','section','detail','unknown'];
  const text = x => typeof x === 'string' && x.length <= 500;
  const strings = x => Array.isArray(x) && x.length <= 12 && x.every(text);
  const fields = (x, keys) => x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).sort().join(',') === keys.slice().sort().join(',');
  function region(crop, width, height) {
    if (![width,height].every(n => Number.isSafeInteger(n) && n > 0) || !crop ||
        ![crop.x,crop.y,crop.width,crop.height].every(Number.isFinite) ||
        crop.x < 0 || crop.y < 0 || crop.width <= 0 || crop.height <= 0 ||
        crop.x + crop.width > width || crop.y + crop.height > height) throw Error('Invalid drawing region.');
    return {...crop};
  }
  function sourceKey(source) {
    if (!source || !['projectId','roomId','sheetId','imageSha256'].every(k => typeof source[k] === 'string' && source[k]) ||
        !/^[a-f0-9]{64}$/.test(source.imageSha256) || !Number.isSafeInteger(source.page) || source.page < 1 ||
        !(source.revision === null || typeof source.revision === 'string')) throw Error('Missing source identity.');
    region(source.crop, source.originalWidth, source.originalHeight);
    return JSON.stringify([source.projectId, source.roomId, source.sheetId, source.page, source.revision, source.imageSha256, source.crop]);
  }
  function bboxToSource(box, source) {
    const c = region(source.crop, source.originalWidth, source.originalHeight);
    if (!Array.isArray(box) || box.length !== 4 || box.some(n => !Number.isFinite(n) || n < 0 || n > 1000) || box[0] >= box[2] || box[1] >= box[3]) throw Error('Invalid AI proposal location.');
    return {x:c.x + box[0]*c.width/1000, y:c.y + box[1]*c.height/1000,
      width:(box[2]-box[0])*c.width/1000, height:(box[3]-box[1])*c.height/1000};
  }
  function buildRun(response, source, id, now = new Date().toISOString()) {
    sourceKey(source);
    const r = response?.result;
    if (response?.schema !== 'site-resolved-vision-v1' || !text(response.model) || !response.model ||
        !fields(r, ['drawingType','summary','proposals','warnings']) || !TYPES.includes(r.drawingType) ||
        !text(r.summary) || !strings(r.warnings) || !Array.isArray(r.proposals) || r.proposals.length > 40) throw Error('Invalid vision result. No proposals were saved.');
    const proposals = r.proposals.map((p,i) => {
      if (!fields(p,['kind','label','bbox','evidenceText','uncertainties']) || !KINDS.includes(p.kind) || !text(p.label) || !text(p.evidenceText) || !strings(p.uncertainties)) throw Error('Invalid vision proposal.');
      return {id:id + '-' + i, kind:p.kind, label:p.label, bbox:bboxToSource(p.bbox,source),
        evidenceText:p.evidenceText, uncertainties:[...p.uncertainties],
        reviewState:'unreviewed', geometryState:'not_modeled', validationState:'unverified'};
    });
    return {schema:'site-resolved-vision-proposals-v1', id, createdAt:now, model:response.model,
      source:JSON.parse(JSON.stringify(source)), drawingType:r.drawingType, summary:r.summary,
      warnings:[...r.warnings], proposals};
  }
  function review(run, id, decision) {
    if (!['unreviewed','kept_for_review','rejected'].includes(decision)) throw Error('Invalid proposal decision.');
    if (!run.proposals.some(p => p.id === id)) throw Error('Proposal no longer exists.');
    return {...run, proposals:run.proposals.map(p => p.id === id ? {...p, reviewState:decision, geometryState:'not_modeled', validationState:'unverified'} : p)};
  }
  return {region, sourceKey, bboxToSource, buildRun, review};
});
