/* RL-1: deterministic evidence review only. Never writes geometry or user wall decisions. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ConstructionRuleLibrary=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
const PREFIX='construction-ai-rule-library-v1:';
const DOMAINS=['line_purpose','scale','source_link','sheet_type','semantic_object','assembly_dimension','finish','coordination'];
const CLASSES=['dimension_annotation_candidate','line_purpose_review','scale_review_required','cross_view_reference_candidate','sheet_type_candidate','layer_classification_candidate','semantic_object_candidate','assembly_dimension_review','finish_condition_candidate','system_coordination_candidate','wall_candidate','not_wall','unresolved'];
const KINDS=['dimension_text','witness_lines','terminators','parallel_pair','line_style','project_legend','view_boundary','scale_text','independent_dimensions','callout_symbol','target_view','sheet_identifier','title_block','layer_name','element_tag','documented_size','related_views','assembly_detail','finish_schedule','host_reference','system_document','clearance_evidence'];
const SOURCE=['project_id','room_id','sheet_id','revision','page','view_id','filename','fingerprint','image_width','image_height','coordinate_space'];
const precedence=['project_documents','project_standards','general_references'];
const clone=value=>JSON.parse(JSON.stringify(value));
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const string=(value,max=500)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const check=(condition,message)=>{if(!condition)throw Error(message)};
function safe(value,depth=0){check(depth<18,'Data is nested too deeply');if(Array.isArray(value)){check(value.length<=2000,'Too many records');value.forEach(x=>safe(x,depth+1));}else if(object(value)){for(const key of Object.keys(value)){check(!['__proto__','constructor','prototype'].includes(key),'Unsafe record key');safe(value[key],depth+1);}}else check(value===null||typeof value==='boolean'||typeof value==='string'&&value.length<=20000||typeof value==='number'&&Number.isFinite(value),'Invalid record value');}
function validateCatalog(catalog){
 safe(catalog);check(object(catalog)&&catalog.schema==='construction-ai-rule-catalog-v1'&&/^\d+\.\d+\.\d+$/.test(catalog.version),'Invalid rule catalog version');
 check(catalog.modeling_enabled===false,'Rules must not enable modeling');check(Array.isArray(catalog.rules)&&catalog.rules.length>0&&catalog.rules.length<=100,'Invalid rule count');const ids=new Set();
 for(const rule of catalog.rules){
  check(object(rule)&&/^[A-Z]+-[A-Z]+-\d{3}$/.test(rule.rule_id)&&!ids.has(rule.rule_id),'Invalid/duplicate rule ID');ids.add(rule.rule_id);
  check(/^\d+\.\d+\.\d+$/.test(rule.version)&&['proposed','approved','disabled'].includes(rule.status)&&string(rule.title),'Invalid rule metadata');
  check(DOMAINS.includes(rule.domain)&&rule.review==='always_required','Invalid rule domain/review');
  check(JSON.stringify(rule.precedence)===JSON.stringify(precedence),'Project source precedence cannot be changed');
  const source=rule.source;check(object(source)&&['document','release','section','local_reference_id'].every(k=>string(source[k]))&&source.citation_status==='needs_local_reference_check','Missing reference provenance');
  check(Array.isArray(source.pages)&&source.pages.every(p=>Number.isSafeInteger(p)&&p>0),'Invalid printed reference pages');
  check(Array.isArray(rule.evidence_requirements)&&rule.evidence_requirements.length>0&&new Set(rule.evidence_requirements).size===rule.evidence_requirements.length&&rule.evidence_requirements.every(k=>KINDS.includes(k)),'Invalid evidence requirements');
  check(object(rule.result)&&CLASSES.includes(rule.result.classification)&&Object.keys(rule.result).every(k=>['classification','constraints'].includes(k)),'Invalid rule result');
  for(const list of [rule.result.constraints,rule.assumptions,rule.negative_examples,rule.tests])check(Array.isArray(list)&&list.length>0&&list.every(x=>string(x,2000)),'Missing constraints/negative examples/tests');
 }
 return true;
}
function validSource(source){return object(source)&&['original_image_pixels','rendered_pdf_page_pixels'].includes(source.coordinate_space)&&SOURCE.every(k=>['page','image_width','image_height'].includes(k)?Number.isSafeInteger(source[k])&&source[k]>0&&source[k]<=1000000:string(source[k],2000));}
function sameSource(a,b){return validSource(a)&&validSource(b)&&SOURCE.every(k=>a[k]===b[k]);}
function validBounds(bounds,source){return Array.isArray(bounds)&&bounds.length===4&&bounds.every(Number.isFinite)&&bounds[0]>=0&&bounds[1]>=0&&bounds[2]>=bounds[0]&&bounds[3]>=bounds[1]&&bounds[2]<=source.image_width&&bounds[3]<=source.image_height;}
function configurationKey(project,hash){check(string(project,200)&&/^[a-f0-9]{64}$/.test(hash),'Invalid project/catalog identity');return PREFIX+encodeURIComponent(project)+':'+hash;}
function createConfig(catalog,hash,project){validateCatalog(catalog);configurationKey(project,hash);return{schema:'construction-ai-rule-config-v1',project_id:project,catalog_version:catalog.version,catalog_sha256:hash,approvals:{},overrides:[],history:[]};}
function validateConfig(config,catalog,hash,project){
 configurationKey(project,hash);safe(config);check(object(config)&&config.schema==='construction-ai-rule-config-v1'&&config.project_id===project&&config.catalog_version===catalog.version&&config.catalog_sha256===hash,'Stale/mismatched project rule preferences; retained for review');
 check(object(config.approvals)&&Array.isArray(config.overrides)&&Array.isArray(config.history)&&config.history.length<=50,'Invalid rule preferences');
 for(const [id,value] of Object.entries(config.approvals)){
  const rule=catalog.rules.find(r=>r.rule_id===id);check(rule&&object(value)&&value.rule_version===rule.version&&['approved','disabled'].includes(value.status)&&string(value.reviewer)&&Number.isFinite(Date.parse(value.at)),'Invalid/stale rule approval');
  if(value.status==='approved')check(value.citation_reviewed===true&&value.tests_reviewed===true,'Reference and tests must be reviewed before activation');
 }
 const ids=new Set();
 for(const item of config.overrides){check(object(item)&&string(item.id)&&!ids.has(item.id)&&DOMAINS.includes(item.domain)&&CLASSES.includes(item.classification)&&['project_documents','project_standards'].includes(item.tier)&&string(item.candidate_id)&&string(item.note)&&object(item.reference)&&['document','sheet_id','revision'].every(k=>string(item.reference[k]))&&Number.isSafeInteger(item.reference.page)&&item.reference.page>0&&validSource(item.source)&&item.source.project_id===project&&string(item.reviewer)&&Number.isFinite(Date.parse(item.at)),'Invalid project source interpretation');ids.add(item.id);}
 for(const snapshot of config.history){const historyless={...snapshot,history:[]};validateConfig(historyless,catalog,hash,project);}
 return true;
}
function transact(config,catalog,hash,project,action){
 validateConfig(config,catalog,hash,project);const next=clone(config);const snapshot=clone(config);snapshot.history=[];next.history=[...next.history,snapshot].slice(-50);
 if(action.type==='approval'){
  check(catalog.rules.some(r=>r.rule_id===action.rule_id&&r.status!=='disabled'),'Rule not available');
  const rule=catalog.rules.find(r=>r.rule_id===action.rule_id);next.approvals[action.rule_id]={...clone(action.review),rule_version:rule.version,status:action.status};
 }else if(action.type==='override'){
  const item=clone(action.value),index=next.overrides.findIndex(x=>x.id===item.id);if(index<0)next.overrides.push(item);else next.overrides[index]=item;
 }else if(action.type==='remove_override')next.overrides=next.overrides.filter(x=>x.id!==action.id);
 else if(action.type==='undo'){check(config.history.length>0,'Nothing to undo');const previous=clone(config.history[config.history.length-1]);previous.history=clone(config.history.slice(0,-1));validateConfig(previous,catalog,hash,project);return previous;}
 else throw Error('Unknown rule preference action');
 validateConfig(next,catalog,hash,project);return next;
}
function evaluate(catalog,config,hash,input){
 validateCatalog(catalog);safe(input);check(object(input)&&string(input.candidate_id)&&DOMAINS.includes(input.domain),'Candidate and domain required');
 const source=input.source,project=source?.project_id;
 const output={schema:'construction-ai-rule-explanation-v1',candidate_id:input.candidate_id,status:'unresolved',classification:'unresolved',precedence:null,matched_rules:[],inactive_rules:[],missing_evidence:[],conflicts:[],source_links:[],assumptions:[],stale_overrides:[],preserved_manual_correction:input.manual_correction?clone(input.manual_correction):null,automatic_confirmation:false,ready_for_verified_3d:false,verified_geometry:false,code_compliance:false,rfi_authorized:false};
 if(!validSource(source)){output.reason='Source sheet, revision, page, view and original image identity must be recorded before applying rules.';return output;}
 validateConfig(config,catalog,hash,project);
 check(Array.isArray(input.evidence)&&input.evidence.length<=1000,'Invalid candidate evidence');
 const ids=new Set();const facts=input.evidence.filter(item=>{check(object(item)&&string(item.id)&&!ids.has(item.id),'Invalid/duplicate evidence identity');ids.add(item.id);return item.observed===true&&item.candidate_id===input.candidate_id&&KINDS.includes(item.kind)&&sameSource(item.source,source)&&validBounds(item.bounds,source);});
 const available=new Set(facts.map(x=>x.kind));let proposals=[];
 for(const rule of catalog.rules.filter(x=>x.domain===input.domain)){
  const approval=config.approvals[rule.rule_id],enabled=rule.status!=='disabled'&&approval?.status==='approved';
  const missing=rule.evidence_requirements.filter(kind=>!available.has(kind));
  output.missing_evidence.push({rule_id:rule.rule_id,kinds:missing});
  if(!enabled){output.inactive_rules.push(rule.rule_id);continue;}
  if(missing.length)continue;
  output.matched_rules.push({rule_id:rule.rule_id,version:rule.version,reference:clone(rule.source),constraints:clone(rule.result.constraints)});
  const used=facts.filter(x=>rule.evidence_requirements.includes(x.kind));
  output.source_links.push(...used.map(x=>({evidence_id:x.id,kind:x.kind,source:clone(x.source),bounds:clone(x.bounds)})));
  proposals.push({classification:rule.result.classification,tier:'general_references',rule_id:rule.rule_id,rank:1});output.assumptions.push(...rule.assumptions);
 }
 for(const item of config.overrides.filter(x=>x.domain===input.domain&&x.candidate_id===input.candidate_id)){
  if(!sameSource(item.source,source)){output.stale_overrides.push(clone(item));continue;}
  proposals.push({...clone(item),rank:item.tier==='project_documents'?3:2});output.source_links.push({override_id:item.id,source:clone(item.source),reference:clone(item.reference),note:item.note});
 }
 const manual=input.manual_correction;
 if(manual){check(object(manual)&&((manual.status==='user_confirmed_2d'&&manual.classification==='wall_candidate')||(manual.status==='rejected_non_wall'&&manual.classification==='not_wall'))&&string(manual.reviewer)&&string(manual.id),'Invalid manual correction');if(sameSource(manual.source,source))proposals.push({...clone(manual),tier:'manual_correction',rank:4});else output.assumptions.push('Saved manual correction is from another source revision; retain it for impact review.');}
 if(!proposals.length){output.reason='No enabled rule has complete matching source evidence; no interpretation is applied.';return output;}
 const rank=Math.max(...proposals.map(x=>x.rank)),top=proposals.filter(x=>x.rank===rank),classes=[...new Set(top.map(x=>x.classification))];
 output.conflicts=proposals.filter(x=>classes.length>1||!classes.includes(x.classification)).map(x=>clone(x));
 output.status='assumption_needs_review';output.precedence=top[0].tier;
 if(classes.length!==1){output.reason='Equally authoritative project sources disagree; interpretation remains unresolved.';return output;}
 output.classification=classes[0];output.reason=rank===4?'Your source-matched correction is retained; rule processing does not replace it.':output.conflicts.length?'Higher-priority project evidence wins; conflicting conventions remain recorded for review.':'Provisional interpretation only. Review drawing evidence before using it.';
 output.assumptions=[...new Set(output.assumptions)];return output;
}
return{validateCatalog,validSource,sameSource,createConfig,validateConfig,configurationKey,transact,evaluate,domains:DOMAINS.slice(),classifications:CLASSES.slice()};
});
