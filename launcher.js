(()=>{'use strict';
const api=window.constructionAIProjects,$=id=>document.getElementById(id),KEY='construction-ai-workspace-confirmed-v1';
const gate=$('workspaceGate'),welcome=$('workspaceWelcome'),choose=$('workspaceChoose'),p=$('workspaceProject'),r=$('workspaceRoom'),enter=$('workspaceEnter'),createRoom=$('workspaceCreateRoom'),back=$('workspaceBack');
let prior=false,mode='project';
function projects(){return api.list()}
function show(which){welcome.hidden=which!=='welcome';choose.hidden=which!=='choose';gate.hidden=false;document.documentElement.classList.add('workspace-pending')}
function hasPrevious(){if(localStorage.getItem(KEY)==='yes')return true;try{const sheets=JSON.parse(localStorage.getItem('construction-ai-sheet-library-v1')||'[]');if(sheets.length)return true}catch{}return projects().some(x=>x.id!=='legacy-project'||x.rooms.some(r=>r.id!=='legacy-room'))}
function refreshProjects(preferred){const items=projects();p.innerHTML='<option value="">Select a project</option>'+items.map(x=>'<option value="'+x.id+'"></option>').join('');for(const x of items){const o=Array.from(p.options).find(y=>y.value===x.id);if(o)o.textContent=x.name}p.value=preferred||'';refreshRooms()}
function refreshRooms(preferred){const item=projects().find(x=>x.id===p.value);r.innerHTML='<option value="">Select a room</option>';for(const x of item?.rooms||[]){const o=document.createElement('option');o.value=x.id;o.textContent=x.name;r.append(o)}r.disabled=!item;r.value=preferred||'';createRoom.disabled=!item;enter.disabled=!(item&&item.rooms.some(x=>x.id===r.value))}
function welcomeScreen(){const labels=api.label();$('workspaceLastProject').textContent=labels.project||'Existing project';$('workspaceLastRoom').textContent=labels.room||'General';show('welcome')}
function chooseScreen(){const selected=api.current();refreshProjects(selected.projectId);refreshRooms(selected.roomId);back.hidden=!prior;show('choose')}
function finish(projectId,roomId){api.selectWorkspace(projectId,roomId);localStorage.setItem(KEY,'yes');prior=true;gate.hidden=true;document.documentElement.classList.remove('workspace-pending');window.constructionAIShowTab?.('drawings')}
$('workspaceContinue').onclick=()=>{const c=api.current();finish(c.projectId,c.roomId)};
$('workspaceChange').onclick=chooseScreen;
p.onchange=()=>refreshRooms();
r.onchange=()=>{enter.disabled=!(p.value&&r.value)};
enter.onclick=()=>{if(!p.value||!r.value)return;finish(p.value,r.value)};
back.onclick=welcomeScreen;
function askName(type){const isRoom=type==='room',label=isRoom?'room':'project';const name=prompt('Name your new '+label+(isRoom?' (for example: Primary Bathroom)':' (for example: Star Island Residence)'))?.trim();if(!name)return;try{if(isRoom){const roomId=api.createRoom(p.value,name);refreshRooms(roomId)}else{const id=api.createProject(name);refreshProjects(id);refreshRooms()}}catch(e){alert(e.message)}}
$('workspaceCreateProject').onclick=()=>askName('project');
createRoom.onclick=()=>askName('room');
window.constructionAIOpenWorkspaceSelector=()=>{prior=true;chooseScreen()};
$('sidebarProjectButton').onclick=()=>window.constructionAIOpenWorkspaceSelector();
prior=hasPrevious();if(prior)welcomeScreen();else{refreshProjects();back.hidden=true;show('choose')}
})();