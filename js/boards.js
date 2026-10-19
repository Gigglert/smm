/* Доски: разработка контента (стадии), доска задач, спринты, колонки */
function renderDev(){
  const b=document.getElementById('devBoard');b.innerHTML='';
  state.devCols.forEach(col=>{
    const posts=state.posts.filter(p=>p.col===col.id);const el=document.createElement('div');el.className='col';
    el.innerHTML=`<div class="col-head">
      <span class="grip" draggable="true" ondragstart="colDragStart(event,'dev','${col.id}')">⠿</span>
      <div class="col-title" contenteditable="true" spellcheck="false" onblur="renameCol('dev','${col.id}',this.innerText)"
        onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${esc(col.name)}</div>
      <span class="col-count">${posts.length}</span>
      <button class="col-x" onclick="delCol('dev','${col.id}')">✕</button></div>
      <div class="col-drop"></div>
      <button class="addcard" onclick="openPost(null,'${col.id}')">＋ новый пост</button>`;
    const drop=el.querySelector('.col-drop');posts.forEach(p=>drop.appendChild(postCard(p)));
    wireDrop(el,id=>{const p=state.posts.find(x=>x.id===id);if(p){p.col=col.id;save();renderDev()}});wireColDrop(el,'dev',col.id);
    b.appendChild(el)});
  b.appendChild(addColBtn('dev'));
}
function postCard(p){
  const d=document.createElement('div');d.className='card';d.draggable=true;
  d.addEventListener('dragstart',e=>{e.dataTransfer.setData('id',p.id);d.classList.add('dragging')});
  d.addEventListener('dragend',()=>d.classList.remove('dragging'));
  d.onclick=()=>{if(!d.classList.contains('dragging'))openPost(p.id)};
  let meta='';const rb=state.rubrics.find(r=>r.id===p.rubric);
  if(rb)meta+=`<span class="chip" style="background:${rb.color};color:#fff">#${esc(rb.name)}</span>`;
  (p.chans||[]).forEach(ch=>meta+=`<span class="chip chan">${esc(ch)}</span>`);
  (p.formats||[]).forEach(f=>meta+=`<span class="chip" style="background:rgba(240,205,178,.5);color:#8a6a4f">${esc(f)}</span>`);
  const src=[p.ideaId?'из идей':'',p.ctype||''].filter(Boolean).join(' · ');
  if(src)meta+=`<span class="chip idea">${esc(src)}</span>`;
  if(p.date)meta+=dueChip(p.date);
  if(p.subs&&p.subs.length){const dn=p.subs.filter(s=>s.done).length;meta+=`<span class="chip subs">✓ ${dn}/${p.subs.length}</span>`}
  d.innerHTML=`<span class="postflag">★</span><div class="card-title">${esc(p.name)}</div>
    ${p.desc?`<div class="card-desc">${esc(p.desc)}</div>`:''}${meta?`<div class="card-meta">${meta}</div>`:''}`;
  return d;
}

function renderSprintBar(){
  const bar=document.getElementById('sprintBar');if(!bar)return;
  bar.innerHTML='<span class="sprint-lbl">Спринт</span>';
  state.sprints.forEach(sp=>{
    const b=document.createElement('button');b.className='spbtn'+(sp.id===state.activeSprint?' on':'');
    const cnt=state.tasks.filter(t=>t.sprint===sp.id).length;
    b.innerText=sp.name+(cnt?' · '+cnt:'');
    b.onclick=()=>{state.activeSprint=sp.id;save();renderTask()};
    bar.appendChild(b);
  });
  const edit=document.createElement('button');edit.className='sp-edit';edit.innerText='✎';edit.title='переименовать / удалить активный спринт';
  edit.onclick=editActiveSprint;bar.appendChild(edit);
  const add=document.createElement('button');add.className='spbtn add';add.innerText='＋ спринт';
  add.onclick=addSprint;bar.appendChild(add);
}
function addSprint(){
  const name=prompt('Название спринта:','Спринт '+(state.sprints.length+1));
  if(!name||!name.trim())return;
  const id='sp'+c().slice(2);state.sprints.push({id,name:name.trim()});state.activeSprint=id;
  save();renderTask();
}
function editActiveSprint(){
  const sp=state.sprints.find(x=>x.id===state.activeSprint);if(!sp)return;
  const name=prompt('Переименовать спринт (пустое поле — удалить спринт):',sp.name);
  if(name===null)return;
  if(!name.trim()){
    if(state.sprints.length<=1){alert('Нельзя удалить единственный спринт');return}
    const cnt=state.tasks.filter(t=>t.sprint===sp.id).length;
    if(cnt&&!confirm('В спринте «'+sp.name+'» '+cnt+' задач(и). Удалить спринт? Задачи переедут в первый оставшийся спринт.'))return;
    state.sprints=state.sprints.filter(x=>x.id!==sp.id);
    const fallback=state.sprints[0].id;
    state.tasks.forEach(t=>{if(t.sprint===sp.id)t.sprint=fallback});
    state.activeSprint=fallback;
  }else{sp.name=name.trim()}
  save();renderTask();
}
function renderTask(){
  renderSprintBar();
  const b=document.getElementById('taskBoard');b.innerHTML='';
  state.taskCols.forEach(col=>{
    const tasks=state.tasks.filter(t=>t.col===col.id&&t.sprint===state.activeSprint);const el=document.createElement('div');el.className='col';
    el.innerHTML=`<div class="col-head">
      <span class="grip" draggable="true" ondragstart="colDragStart(event,'task','${col.id}')">⠿</span>
      <div class="col-title" contenteditable="true" spellcheck="false" onblur="renameCol('task','${col.id}',this.innerText)"
        onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${esc(col.name)}</div>
      <span class="col-count">${tasks.length}</span>
      <button class="col-x" onclick="delCol('task','${col.id}')">✕</button></div>
      <div class="col-drop"></div>
      <button class="addcard" onclick="openTask(null,'${col.id}')">＋ новая карточка</button>`;
    const drop=el.querySelector('.col-drop');tasks.forEach(t=>drop.appendChild(taskCard(t)));
    wireDrop(el,id=>{const t=state.tasks.find(x=>x.id===id);if(t){t.col=col.id;save();renderTask()}});wireColDrop(el,'task',col.id);
    b.appendChild(el)});
  b.appendChild(addColBtn('task'));
}
function taskCard(t){
  const d=document.createElement('div');d.className='card';d.draggable=true;
  const done=colStatus((state.taskCols.find(x=>x.id===t.col)||{}).name)==='done';
  if(t.due&&!done&&daysLeft(t.due)<0)d.classList.add('overdue');
  d.addEventListener('dragstart',e=>{e.dataTransfer.setData('id',t.id);d.classList.add('dragging')});
  d.addEventListener('dragend',()=>d.classList.remove('dragging'));
  d.onclick=()=>{if(!d.classList.contains('dragging'))openTask(t.id)};
  let meta='';if(t.tag)meta+=`<span class="chip tag">${esc(t.tag)}</span>`;if(t.due)meta+=dueChip(t.due);
  if(t.subs&&t.subs.length){const dn=t.subs.filter(s=>s.done).length;meta+=`<span class="chip subs">✓ ${dn}/${t.subs.length}</span>`}
  d.innerHTML=`<div class="card-title">${esc(t.name)}</div>
    ${t.desc?`<div class="card-desc">${esc(t.desc)}</div>`:''}${meta?`<div class="card-meta">${meta}</div>`:''}`;
  return d;
}

function colDragStart(e,board,id){e.dataTransfer.setData('colid',id);e.dataTransfer.setData('colboard',board)}
function reorderCol(board,dragId,targetId){
  if(dragId===targetId)return;
  const cols=board==='dev'?state.devCols:state.taskCols;
  const from=cols.findIndex(x=>x.id===dragId),to=cols.findIndex(x=>x.id===targetId);
  if(from<0||to<0)return;
  const [m]=cols.splice(from,1);cols.splice(to,0,m);
  save();board==='dev'?renderDev():renderTask();
}
function wireColDrop(el,board,colId){
  el.addEventListener('drop',e=>{const cid=e.dataTransfer.getData('colid');
    if(cid){e.preventDefault();reorderCol(e.dataTransfer.getData('colboard')||board,cid,colId)}});
}
function wireDrop(el,onDrop){
  el.addEventListener('dragover',e=>{e.preventDefault();el.style.borderColor='var(--accent)'});
  el.addEventListener('dragleave',()=>el.style.borderColor='');
  el.addEventListener('drop',e=>{e.preventDefault();el.style.borderColor='';const id=e.dataTransfer.getData('id');if(id)onDrop(id)});
}
function addColBtn(board){
  const add=document.createElement('button');add.className='add-col';add.innerHTML='＋ колонка';
  add.onclick=()=>{(board==='dev'?state.devCols:state.taskCols).push({id:c(),name:'Новая колонка'});save();board==='dev'?renderDev():renderTask()};
  return add;
}
function renameCol(board,id,name){const cols=board==='dev'?state.devCols:state.taskCols;const col=cols.find(x=>x.id===id);
  if(col){col.name=name.trim()||col.name;save();if(board==='dev')renderCal()}}
function delCol(board,id){
  const cols=board==='dev'?state.devCols:state.taskCols;const items=board==='dev'?state.posts:state.tasks;
  if(items.some(x=>x.col===id)&&!confirm('В колонке есть карточки — удалить вместе с ними?'))return;
  if(board==='dev'){unlinkIdeas(state.posts.filter(x=>x.col===id).map(x=>x.id));
    state.posts=state.posts.filter(x=>x.col!==id);state.devCols=cols.filter(x=>x.id!==id)}
  else{state.tasks=state.tasks.filter(x=>x.col!==id);state.taskCols=cols.filter(x=>x.id!==id)}
  save();board==='dev'?renderDev():renderTask();
}
