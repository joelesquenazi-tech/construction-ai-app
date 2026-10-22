(()=>{'use strict';
const KEY='construction-ai-projects-v1',ACTIVE='construction-ai-active-room-v1';
const DEFAULT={projects:[{id:'legacy-project',name:'Existing project',rooms:[{id:'legacy-room',name:'General / existing drawings'}]}]};
let state;try{state=JSON.parse(localStorage.getItem(KEY)||'null')||DEFAULT}catch{state=DEFAULT}
if(!Array.isArray(state.projects)||!state.projects.length)state=DEFAULT;
let current;try{current=JSON.parse(localStorage.getItem(ACTIVE)||'null')}catch{}
if(!current||!state.projects.some(p=>p.id===current.projectId&&p.rooms.some(r=>r.id===current.roomId)))current={projectId:state.projects[0].id,roomId:state.projects[0].rooms[0].id};
const $=id=>document.getElementById(id),uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
const save=()=>{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem(ACTIVE,JSON.stringify(current))};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const project=()=>state.projects.find(p=>p.id===current.projectId),room=()=>project()?.rooms.find(r=>r.id===current.roomId);
function render(){const p=$('projectSelector'),r=$('roomSelector');if(!p||!r)return;p.innerHTML=state.projects.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');p.value=current.projectId;r.innerHTML=(project()?.rooms||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');r.value=current.roomId;$('activeProjectName').textContent=(project()?.name||'Project')+' / '+(room()?.name||'Room')}
function change(){save();render();window.dispatchEvent(new CustomEvent('construction-room-change',{detail:{...current}}))}
function createProject(name){name=String(name||'').trim();if(!name)throw Error('Project name is required');const p={id:uid(),name:name.slice(0,90),rooms:[]};state.projects.push(p);save();return p.id}
function createRoom(projectId,name){name=String(name||'').trim();const p=state.projects.find(x=>x.id===projectId);if(!p||!name)throw Error('Choose a project and enter a room name');const r={id:uid(),name:name.slice(0,90)};p.rooms.push(r);save();return r.id}
function selectWorkspace(projectId,roomId){const p=state.projects.find(x=>x.id===projectId);if(!p?.rooms.some(r=>r.id===roomId))throw Error('Select a valid project and room');current={projectId,roomId};change()}
window.constructionAIProjects={current:()=>({...current}),label:()=>({project:project()?.name,room:room()?.name}),list:()=>state.projects.map(p=>({id:p.id,name:p.name,rooms:p.rooms.map(r=>({id:r.id,name:r.name}))})),createProject,createRoom,selectWorkspace,belongs:s=>s.projectId===current.projectId&&s.roomId===current.roomId,change,render};
$('projectSelector').onchange=e=>{const p=state.projects.find(x=>x.id===e.target.value);if(!p)return;if(!p.rooms.length)return;selectWorkspace(p.id,p.rooms[0].id)};
$('roomSelector').onchange=e=>{if(!project()?.rooms.some(x=>x.id===e.target.value))return;current.roomId=e.target.value;change()};
$('newProject').onclick=()=>{const name=prompt('New project name (for example: Star Island Residence)')?.trim();if(!name)return;const projectId=createProject(name),roomId=createRoom(projectId,'General');selectWorkspace(projectId,roomId)};
$('newRoom').onclick=()=>{const name=prompt('New room or area name (for example: Primary Bath)')?.trim();if(!name)return;const roomId=createRoom(current.projectId,name);selectWorkspace(current.projectId,roomId)};
$('renameProject').onclick=()=>{const p=project(),name=prompt('Rename project',p.name)?.trim();if(!name)return;p.name=name.slice(0,90);change()};
$('renameRoom').onclick=()=>{const r=room(),name=prompt('Rename room',r.name)?.trim();if(!name)return;r.name=name.slice(0,90);change()};
save();render();
})();