/* Project-scoped local rule review; no writes to drawing, scale or geometry stores. */
(() => {
'use strict';
const core=window.ConstructionRuleLibrary,host=document.getElementById('knowledge');
if(!core||!host)return;
const EXPECTED_HASH='9445428af04dec9ec1ffbf2512a6d467d49e0a346de6c3d2d4e4353cfb4eea04';
const section=document.createElement('section');section.id='drawingRuleLibrary';section.className='library-panel rule-library-panel';
section.innerHTML='<h2>Drawing conventions</h2><p>Project drawings and details take priority, followed by the project legend, then general reference conventions. Suggestions never verify geometry, scale or code compliance.</p><p id="ruleProject"></p><p id="ruleLibraryStatus" role="status">Loading local rule catalog…</p><button id="ruleRetry" type="button" hidden>Retry loading rules</button><label>Reviewer<input id="ruleReviewer" maxlength="120" placeholder="Name or reviewer ID"></label><div class="rule-library-actions"><button id="ruleUndo" type="button" disabled>Undo rule change</button><button id="ruleExport" type="button" disabled>Export project rule decisions</button></div><div id="ruleCards"></div><details id="ruleProjectOverride"><summary>Project-source interpretation for a selected line</summary><p>These are your source-linked interpretations, not automatic recognition. Record the sheet, revision and view you checked; use project details before general conventions.</p><form id="ruleOverrideForm"><label>Selected source sheet<input id="ruleSourceSheet" required maxlength="120"></label><label>Selected source revision<input id="ruleSourceRevision" required maxlength="120"></label><label>Selected source view<input id="ruleSourceView" required maxlength="120" placeholder="For example: Floor plan A"></label><label>Evidence priority<select id="ruleOverrideTier"><option value="project_documents">Project drawing / detail / specification</option><option value="project_standards">Project legend / architect or owner standard</option></select></label><label>Interpretation<select id="ruleOverrideClass"><option value="wall_candidate">Possible wall line</option><option value="dimension_annotation_candidate">Dimension annotation</option><option value="not_wall">Not a wall</option><option value="unresolved">Unresolved</option></select></label><label>Reference document<input id="ruleReferenceDoc" required maxlength="200" placeholder="Drawing set or project legend"></label><label>Reference sheet / section<input id="ruleReferenceSheet" required maxlength="120"></label><label>Reference revision<input id="ruleReferenceRevision" required maxlength="120"></label><label>Reference page<input id="ruleReferencePage" type="number" min="1" step="1" required></label><label>Evidence and reason<textarea id="ruleOverrideNote" required maxlength="500"></textarea></label><button id="ruleSaveOverride" type="submit" disabled>Save project interpretation</button></form></details><ul id="ruleOverrideList"></ul>';
host.append(section);
const $=id=>document.getElementById(id),status=$('ruleLibraryStatus');
const approval=document.createElement('dialog');approval.id='ruleApprovalDialog';approval.innerHTML='<form id="ruleApprovalForm"><h2>Enable local suggestions?</h2><p id="ruleApprovalTitle"></p><label>Reviewer<input id="ruleApprovalReviewer" required maxlength="120"></label><p>Check the cited reference and rule checks against this project first. This enables review suggestions only. It does not approve a wall, scale, construction method or model.</p><label><input id="ruleCitationReviewed" type="checkbox" required> I reviewed the cited reference for this project.</label><label><input id="ruleTestsReviewed" type="checkbox" required> I reviewed the evidence requirements and negative examples.</label><p id="ruleApprovalError" role="alert"></p><button id="ruleApprovalCancel" type="button">Cancel</button><button type="submit">Enable suggestions</button></form>';document.body.append(approval);
let catalog=null,manifest=null,config=null,context=null,pendingRule=null,fatal=false;
const projectId=()=>window.constructionAIProjects?.current()?.projectId;
const human=value=>String(value).replaceAll('_',' ');
const node=(tag,text)=>{const value=document.createElement(tag);value.textContent=text;return value;};
function info(message){status.textContent=message;}
function readProject(){
 if(!catalog)return;const id=projectId();const key=core.configurationKey(id,manifest.sha256),raw=localStorage.getItem(key);
 config=raw?JSON.parse(raw):core.createConfig(catalog,manifest.sha256,id);core.validateConfig(config,catalog,manifest.sha256,id);
 $('ruleProject').textContent='Project: '+window.constructionAIProjects.label().project+' · Catalog '+catalog.version+' · decisions apply to this catalog version only.';
}
function change(action){
 try{if(fatal||!config||config.project_id!==projectId())throw Error('Project changed; reopen rule review.');const next=core.transact(config,catalog,manifest.sha256,projectId(),action);localStorage.setItem(core.configurationKey(projectId(),manifest.sha256),JSON.stringify(next));config=next;render();explain();info('Project rule decision saved on this device. Geometry and wall review decisions are unchanged.');return true;}
 catch(error){info('Could not save rule decision: '+error.message);return false;}
}
function reviewer(){const value=$('ruleReviewer').value.trim();if(!value)throw Error('Enter a reviewer name or ID.');return value;}
function render(){
 const cards=$('ruleCards');cards.replaceChildren();if(!catalog||!config)return;
 $('ruleUndo').disabled=!config.history.length;$('ruleExport').disabled=false;
 for(const rule of catalog.rules){const card=document.createElement('details');card.className='rule-card';const state=config.approvals[rule.rule_id]?.status||'proposed';card.append(node('summary',rule.title+' — '+(state==='approved'?'Enabled for review':state==='disabled'?'Disabled':'Proposed · inactive')));card.append(node('p',rule.rule_id+' · '+rule.source.document+' '+rule.source.release+' · §'+rule.source.section+(rule.source.pages.length?' · printed p. '+rule.source.pages.join(', '):' · check printed pages locally')));card.append(node('p','Reference PDFs are not bundled. Confirm the cited sections against your local copy before enabling.'));card.append(node('p','Evidence required: '+rule.evidence_requirements.map(human).join(', ')));card.append(node('p','Do not assume a match when: '+rule.negative_examples.join('; ')));card.append(node('p','Constraints: '+rule.result.constraints.join('; ')));
 const enable=node('button','Enable suggestions');enable.type='button';enable.disabled=rule.status==='disabled'||state==='approved';enable.onclick=()=>{pendingRule=rule;approval.querySelector('form').reset();$('ruleApprovalError').textContent='';$('ruleApprovalTitle').textContent=rule.title;$('ruleApprovalReviewer').value=$('ruleReviewer').value;approval.showModal();};
 const disable=node('button','Disable');disable.type='button';disable.disabled=state==='disabled';disable.onclick=()=>{try{change({type:'approval',rule_id:rule.rule_id,status:'disabled',review:{reviewer:reviewer(),at:new Date().toISOString()}})}catch(error){info(error.message)}};card.append(enable,disable);cards.append(card);}
 const list=$('ruleOverrideList');list.replaceChildren();for(const item of config.overrides){const li=node('li',item.reference.sheet_id+' rev '+item.reference.revision+' · '+human(item.classification)+' · '+item.note);const remove=node('button','Remove interpretation');remove.type='button';remove.onclick=()=>change({type:'remove_override',id:item.id});li.append(remove);list.append(li);}
 $('ruleSaveOverride').disabled=!context;
}
$('ruleApprovalCancel').onclick=()=>approval.close();
$('ruleApprovalForm').onsubmit=event=>{event.preventDefault();try{$('ruleReviewer').value=$('ruleApprovalReviewer').value.trim();const review={reviewer:reviewer(),at:new Date().toISOString(),citation_reviewed:$('ruleCitationReviewed').checked,tests_reviewed:$('ruleTestsReviewed').checked};if(change({type:'approval',rule_id:pendingRule.rule_id,status:'approved',review}))approval.close();else $('ruleApprovalError').textContent='Could not save. Check the rule-library status.';}catch(error){$('ruleApprovalError').textContent=error.message}};
$('ruleUndo').onclick=()=>change({type:'undo'});
$('ruleExport').onclick=()=>{
 if(!config)return;
 try{const prefix=core.configurationKey(projectId(),manifest.sha256).slice(0,-64),versions=[];
 for(const key of Object.keys(localStorage).filter(key=>key.startsWith(prefix))){const raw=localStorage.getItem(key);let data;try{data=JSON.parse(raw)}catch{data={unparsed:raw}}versions.push({storage_key:key,data});}
 const backup={schema:'construction-ai-rule-decisions-export-v1',project_id:projectId(),current_catalog:manifest.sha256,versions};
 const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='construction-ai-project-rule-decisions.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(error){info('Could not export project rule decisions: '+error.message);}
};
let explanation;
function ensureExplanation(){const panel=$('wallCandidatePanel');if(!panel)return null;if(!explanation){explanation=document.createElement('details');explanation.id='wallRuleExplanation';explanation.className='rule-explanation';explanation.append(node('summary','Why this line needs review'));const body=document.createElement('div');body.id='wallRuleExplanationBody';body.setAttribute('role','status');explanation.append(body);panel.append(explanation);}return $('wallRuleExplanationBody');}
function declaredSource(){
 if(!context)return null;let source={...context.source};
 // Reuse only explicitly recorded identity on the same exact file/page/room.
 const identity=['project_id','room_id','filename','fingerprint','image_width','image_height','page','coordinate_space'];
 const declarations=config?.overrides.filter(item=>item.candidate_id===context.candidate_id&&identity.every(k=>item.source[k]===source[k])&&['sheet_id','revision','view_id'].every(k=>!source[k]||source[k]===item.source[k]));
 if(declarations?.length&&new Set(declarations.map(item=>JSON.stringify(item.source))).size===1)source={...declarations[0].source};return source;
}
function explain(){
 const body=ensureExplanation();if(!body)return;body.replaceChildren();
 if(!catalog||!config||fatal){body.append(node('p','Rule library unavailable. No drawing rules are being applied.'));return;}
 if(!context){body.append(node('p','Select a possible wall line to review its evidence.'));return;}
 try{const source=declaredSource(),manual=context.manual_correction?JSON.parse(JSON.stringify(context.manual_correction)):null;
 const result=core.evaluate(catalog,config,manifest.sha256,{...context,source,manual_correction:manual});
 body.append(node('p',result.reason),node('p','Interpretation: '+human(result.classification)+' · review required. No geometry or scale was changed.'));
 if(context.manual_correction)body.append(node('p','Your saved '+human(context.manual_correction.classification)+' decision is retained independently of these rules.'));
 body.append(node('p','Observed source evidence: '+(context.evidence.map(x=>human(x.kind)).join(', ')||'none')));
 const dimension=catalog.rules.find(x=>x.rule_id==='CONV-DIM-001');const kinds=new Set(context.evidence.filter(x=>x.observed).map(x=>x.kind));body.append(node('p','Dimension-line checks still needed: '+(dimension.evidence_requirements.filter(x=>!kinds.has(x)).map(human).join(', ')||'none missing from this evidence snapshot; independent validation is still required')));
 body.append(node('p','Reference: '+dimension.source.document+' '+dimension.source.release+', §'+dimension.source.section+', printed pp. 64–68. General convention only.'));
 if(!core.validSource(source))body.append(node('p','Source sheet/revision/view identity is incomplete. Record a checked project source in Drawing conventions before any rule interpretation can apply.'));
 if(result.conflicts.length)body.append(node('p','Conflicting evidence retained: '+result.conflicts.map(x=>x.tier+': '+human(x.classification)).join('; ')));
 if(result.stale_overrides.length)body.append(node('p','Interpretations from another revision were retained for review and not applied.'));
 }catch(error){body.append(node('p','Rule review unavailable: '+error.message+'. Existing corrections are unchanged.'));}
}
window.addEventListener('construction-wall-rule-context',event=>{
 const next=event.detail;context=next&&next.source?.project_id===projectId()&&next.source?.room_id===window.constructionAIProjects.current().roomId?JSON.parse(JSON.stringify(next)):null;
 if(context){$('ruleSourceSheet').value=context.source.sheet_id||'';$('ruleSourceRevision').value=context.source.revision||'';$('ruleSourceView').value=context.source.view_id||'';}
 $('ruleSaveOverride').disabled=!context||fatal;explain();
});
$('ruleOverrideForm').onsubmit=event=>{event.preventDefault();try{
 if(!context||context.source.project_id!==projectId())throw Error('Select a line in the current project first.');
 const source={...context.source,sheet_id:$('ruleSourceSheet').value.trim(),revision:$('ruleSourceRevision').value.trim(),view_id:$('ruleSourceView').value.trim()};if(!core.validSource(source))throw Error('Complete source identity and original image coordinates are required.');
 const value={id:'project-interpretation:'+crypto.randomUUID(),candidate_id:context.candidate_id,domain:'line_purpose',classification:$('ruleOverrideClass').value,tier:$('ruleOverrideTier').value,source,reference:{document:$('ruleReferenceDoc').value.trim(),sheet_id:$('ruleReferenceSheet').value.trim(),revision:$('ruleReferenceRevision').value.trim(),page:Number($('ruleReferencePage').value)},note:$('ruleOverrideNote').value.trim(),reviewer:reviewer(),at:new Date().toISOString()};change({type:'override',value});
 }catch(error){info('Could not save interpretation: '+error.message);}};
async function load(){
 fatal=false;$('ruleRetry').hidden=true;
 try{const [metadata,response]=await Promise.all([fetch('./rule-library/v1/manifest.json'),fetch('./rule-library/v1/catalog.json')]);if(!metadata.ok||!response.ok)throw Error('Local catalog unavailable; refresh the app online once.');const data=await response.text();manifest=await metadata.json();if(manifest.schema!=='construction-ai-rule-manifest-v1'||manifest.sha256!==EXPECTED_HASH)throw Error('Unrecognized catalog manifest');const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(data))),x=>x.toString(16).padStart(2,'0')).join('');if(digest!==EXPECTED_HASH)throw Error('Catalog checksum mismatch');catalog=JSON.parse(data);core.validateCatalog(catalog);if(catalog.version!==manifest.catalog_version)throw Error('Catalog version mismatch');readProject();render();explain();info('Local catalog ready. '+Object.values(config.approvals).filter(value=>value.status==='approved').length+' rule(s) enabled for local review. No model approval is granted.');}
 catch(error){fatal=true;catalog=null;config=null;$('ruleCards').replaceChildren();$('ruleUndo').disabled=$('ruleExport').disabled=$('ruleSaveOverride').disabled=true;info('Rules unavailable: '+error.message+'. Saved decisions have not been changed.');$('ruleRetry').hidden=false;explain();}
}
$('ruleRetry').onclick=load;
window.addEventListener('construction-room-change',()=>{context=null;approval.close();pendingRule=null;if(!catalog)return;try{readProject();fatal=false;render();explain();info('Project rule preferences loaded. Geometry remains unchanged.');}catch(error){fatal=true;config=null;$('ruleUndo').disabled=$('ruleExport').disabled=true;info('Saved rule preferences could not be read: '+error.message+'. They have been retained unchanged.');$('ruleCards').replaceChildren();$('ruleSaveOverride').disabled=true;}});
load();
})();
