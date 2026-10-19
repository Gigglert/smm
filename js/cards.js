/* Окна карточек: пост, задача (с копированием в спринт), ресурсы */
let editPostId=null,newPostCol=null,draftSubs=[];
function fillChans(box,selected){box.innerHTML='';const sel=new Set(selected||[]);
  CHANNELS.forEach(ch=>{const b=document.createElement('button');b.type='button';
    b.className='chbtn'+(sel.has(ch)?' on':'');b.innerText=ch;
    b.onclick=()=>b.classList.toggle('on');box.appendChild(b)})}
function readChans(){return [...document.querySelectorAll('#pChans .chbtn.on')].map(b=>b.innerText)}
function fillFormats(box,selected){box.innerHTML='';const sel=new Set(selected||[]);
  state.formats.forEach(f=>{const b=document.createElement('button');b.type='button';
    b.className='chbtn'+(sel.has(f)?' on':'');b.innerText=f;
    b.onclick=()=>b.classList.toggle('on');box.appendChild(b)})}
function readFormats(){return [...document.querySelectorAll('#pFormats .chbtn.on')].map(b=>b.innerText)}
function fillCols(sel,val){sel.innerHTML=state.devCols.map(c=>`<option value="${c.id}" ${c.id===val?'selected':''}>${esc(c.name)}</option>`).join('')}
function fillRubrics(sel,val){sel.innerHTML='<option value="">— рубрика —</option>'+
  state.rubrics.map(r=>`<option value="${r.id}" ${r.id===val?'selected':''}>#${esc(r.name)}</option>`).join('')}
function openPost(id,col,date){
  editPostId=id;newPostCol=col;
  if(id){const p=state.posts.find(x=>x.id===id);document.getElementById('postTitle').innerText='Пост';
    document.getElementById('pName').value=p.name;document.getElementById('pDesc').value=p.desc||'';
    fillCols(document.getElementById('pCol'),p.col);fillChans(document.getElementById('pChans'),p.chans||[]);fillRubrics(document.getElementById('pRubric'),p.rubric||'');document.getElementById('pNewRubric').value='';fillFormats(document.getElementById('pFormats'),p.formats||[]);document.getElementById('pNewFormat').value='';document.getElementById('pDate').value=p.date||'';
    draftSubs=JSON.parse(JSON.stringify(p.subs||[]));document.getElementById('pDel').style.display='block';
  }else{document.getElementById('postTitle').innerText='Новый пост';
    document.getElementById('pName').value='';document.getElementById('pDesc').value='';
    fillCols(document.getElementById('pCol'),col||(state.devCols[0]&&state.devCols[0].id));fillChans(document.getElementById('pChans'),[]);fillRubrics(document.getElementById('pRubric'),'');document.getElementById('pNewRubric').value='';fillFormats(document.getElementById('pFormats'),[]);document.getElementById('pNewFormat').value='';document.getElementById('pDate').value=date||'';
    draftSubs=[];document.getElementById('pDel').style.display='none';}
  renderDraftSubs();document.getElementById('ovPost').classList.add('on');
  setTimeout(()=>document.getElementById('pName').focus(),50);
}
function renderDraftSubs(){const box=document.getElementById('pSubs');box.innerHTML='';
  draftSubs.forEach((s,i)=>{const el=document.createElement('div');el.className='sub';
    el.innerHTML=`<input type="checkbox" ${s.done?'checked':''} onchange="draftSubs[${i}].done=this.checked;renderDraftSubs()">
      <span class="${s.done?'done':''}">${esc(s.t)}</span>
      <button class="sx" onclick="draftSubs.splice(${i},1);renderDraftSubs()">✕</button>`;box.appendChild(el)})}
function addSubInput(){const inp=document.getElementById('pSubNew');const v=inp.value.trim();
  if(!v)return;draftSubs.push({t:v,done:false});inp.value='';renderDraftSubs();inp.focus()}
function savePost(auto){
  const subIn=document.getElementById('pSubNew');
  if(subIn.value.trim()){draftSubs.push({t:subIn.value.trim(),done:false});subIn.value=''}
  let name=document.getElementById('pName').value.trim();
  if(!name){
    if(!auto){document.getElementById('pName').focus();return}
    const old=editPostId&&state.posts.find(x=>x.id===editPostId);
    if(old)name=old.name;
    else if(!document.getElementById('pDesc').value.trim()&&!draftSubs.length&&!readChans().length&&!readFormats().length&&
      !document.getElementById('pRubric').value&&!document.getElementById('pNewRubric').value.trim()&&
      !document.getElementById('pNewFormat').value.trim()){closeOv('ovPost');return}
    else name='Без названия';
  }
  const desc=document.getElementById('pDesc').value.trim();const chans=readChans();
  const date=document.getElementById('pDate').value;
  let rubric=document.getElementById('pRubric').value;
  const nr=document.getElementById('pNewRubric').value.trim().replace(/^#/,'');
  if(nr){const ex=state.rubrics.find(r=>r.name.toLowerCase()===nr.toLowerCase());
    if(ex)rubric=ex.id;
    else{const nid='rb'+c().slice(2);state.rubrics.push({id:nid,name:nr,color:RUB_COLORS[state.rubrics.length%RUB_COLORS.length]});rubric=nid}}
  let formats=readFormats();
  const nf=document.getElementById('pNewFormat').value.trim();
  if(nf){if(!state.formats.includes(nf))state.formats.push(nf);if(!formats.includes(nf))formats.push(nf)}
  const pcol=document.getElementById('pCol').value||newPostCol||(state.devCols[0]&&state.devCols[0].id);
  if(editPostId){const p=state.posts.find(x=>x.id===editPostId);p.name=name;p.desc=desc;p.chans=chans;p.rubric=rubric;p.formats=formats;p.date=date;p.col=pcol;p.subs=draftSubs;}
  else{state.posts.push({id:c(),name,desc,chans,rubric,formats,date,col:pcol,subs:draftSubs})}
  save();closeOv('ovPost');renderCal();renderDev();
}
function deletePost(){if(!confirm('Удалить пост? Он исчезнет и из календаря, и из доски.'))return;
  state.posts=state.posts.filter(x=>x.id!==editPostId);unlinkIdeas([editPostId]);save();closeOv('ovPost');renderCal();renderDev()}

let editTaskId=null,newTaskCol=null,draftTaskSubs=[];
function fillSprints(sel,val){sel.innerHTML=state.sprints.map(sp=>`<option value="${sp.id}" ${sp.id===val?'selected':''}>${esc(sp.name)}</option>`).join('')}
function renderTaskSubs(){const box=document.getElementById('kSubs');box.innerHTML='';
  draftTaskSubs.forEach((s,i)=>{const el=document.createElement('div');el.className='sub';
    el.innerHTML=`<input type="checkbox" ${s.done?'checked':''} onchange="draftTaskSubs[${i}].done=this.checked;renderTaskSubs()">
      <span class="${s.done?'done':''}">${esc(s.t)}</span>
      <button class="sx" onclick="draftTaskSubs.splice(${i},1);renderTaskSubs()">✕</button>`;box.appendChild(el)})}
function addTaskSub(){const inp=document.getElementById('kSubNew');const v=inp.value.trim();
  if(!v)return;draftTaskSubs.push({t:v,done:false});inp.value='';renderTaskSubs();inp.focus()}
function openTask(id,col){editTaskId=id;newTaskCol=col;
  if(id){const t=state.tasks.find(x=>x.id===id);document.getElementById('taskTitle').innerText='Карточка';
    document.getElementById('kName').value=t.name;document.getElementById('kDesc').value=t.desc||'';
    document.getElementById('kDue').value=t.due||'';document.getElementById('kTag').value=t.tag||'';
    fillSprints(document.getElementById('kSprint'),t.sprint||state.activeSprint);
    draftTaskSubs=JSON.parse(JSON.stringify(t.subs||[]));
    document.getElementById('kDel').style.display='block';
  }else{document.getElementById('taskTitle').innerText='Новая задача';
    document.getElementById('kName').value='';document.getElementById('kDesc').value='';
    document.getElementById('kDue').value='';document.getElementById('kTag').value='';
    fillSprints(document.getElementById('kSprint'),state.activeSprint);
    draftTaskSubs=[];
    document.getElementById('kDel').style.display='none';}
  fillCopySprints();
  renderTaskSubs();
  document.getElementById('ovTask').classList.add('on');setTimeout(()=>document.getElementById('kName').focus(),50);
}
function saveTask(auto){
  const subIn=document.getElementById('kSubNew');
  if(subIn.value.trim()){draftTaskSubs.push({t:subIn.value.trim(),done:false});subIn.value=''}
  let name=document.getElementById('kName').value.trim();
  if(!name){
    if(!auto){document.getElementById('kName').focus();return}
    const old=editTaskId&&state.tasks.find(x=>x.id===editTaskId);
    if(old)name=old.name;
    else if(!document.getElementById('kDesc').value.trim()&&!document.getElementById('kDue').value&&
      !document.getElementById('kTag').value.trim()&&!draftTaskSubs.length){closeOv('ovTask');return}
    else name='Без названия';
  }
  const desc=document.getElementById('kDesc').value.trim();const due=document.getElementById('kDue').value;
  const tag=document.getElementById('kTag').value.trim();
  const sprint=document.getElementById('kSprint').value||state.activeSprint;
  if(editTaskId){const t=state.tasks.find(x=>x.id===editTaskId);t.name=name;t.desc=desc;t.due=due;t.tag=tag;t.sprint=sprint;t.subs=draftTaskSubs;}
  else{const col=newTaskCol||(state.taskCols[0]&&state.taskCols[0].id);state.tasks.push({id:c(),name,desc,due,tag,col,sprint,subs:draftTaskSubs})}
  save();closeOv('ovTask');renderTask();
}
/* копия карточки в другой спринт: оригинал остаётся, копия живёт сама по себе */
function fillCopySprints(){
  const box=document.getElementById('kCopyBox'),t=editTaskId&&state.tasks.find(x=>x.id===editTaskId);
  document.getElementById('kCopyMsg').innerText='';
  const others=t?state.sprints.filter(sp=>sp.id!==t.sprint):[];
  box.style.display=others.length?'block':'none';
  document.getElementById('kCopySprint').innerHTML=others.map(sp=>`<option value="${sp.id}">${esc(sp.name)}</option>`).join('');
}
function copyTaskToSprint(){
  const t=state.tasks.find(x=>x.id===editTaskId);if(!t)return;
  const target=document.getElementById('kCopySprint').value,sp=state.sprints.find(x=>x.id===target);if(!sp)return;
  /* сначала сохраняем правки в самой карточке, чтобы копия была актуальной */
  const subIn=document.getElementById('kSubNew');
  if(subIn.value.trim()){draftTaskSubs.push({t:subIn.value.trim(),done:false});subIn.value='';renderTaskSubs()}
  t.name=document.getElementById('kName').value.trim()||t.name;
  t.desc=document.getElementById('kDesc').value.trim();t.due=document.getElementById('kDue').value;
  t.tag=document.getElementById('kTag').value.trim();t.subs=JSON.parse(JSON.stringify(draftTaskSubs));
  t.sprint=document.getElementById('kSprint').value||t.sprint;
  state.tasks.push({id:c(),name:t.name,desc:t.desc,due:t.due,tag:t.tag,col:t.col,sprint:target,subs:JSON.parse(JSON.stringify(t.subs))});
  save();renderTask();
  document.getElementById('kCopyMsg').innerText='✓ Копия добавлена в спринт «'+sp.name+'»';
}
function deleteTask(){if(!confirm('Удалить карточку?'))return;
  state.tasks=state.tasks.filter(x=>x.id!==editTaskId);save();closeOv('ovTask');renderTask()}

function renderMat(){
  const g=document.getElementById('matGrid');g.innerHTML='';
  state.mats.forEach(m=>{const el=document.createElement('div');el.className='mat'+(m.star?' star':'');
    el.innerHTML=`${m.star?'<span class="mat-star">★</span>':''}
      <button class="mat-x" onclick="event.stopPropagation();openMat('${m.id}')" title="редактировать">✎</button>
      <span class="mat-plat">${esc(safeHost(m.url))}</span>
      ${m.url?`<a class="mat-link" href="${encodeURI(m.url)}" target="_blank" rel="noopener">${esc(m.label)}</a>`
        :`<span class="mat-link">${esc(m.label)}</span>`}
      ${m.note?`<div class="mat-note">${esc(m.note)}</div>`:''}
      <div class="mat-url">${m.url?esc(m.url):'ссылка не указана'}</div>`;g.appendChild(el)});
  const add=document.createElement('button');add.className='mat-add';add.innerText='＋ добавить ссылку';
  add.onclick=()=>openMat(null);g.appendChild(add);
}
function safeHost(u){try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return 'ссылка'}}
let editMatId=null;
function openMat(id){editMatId=id;
  if(id){const m=state.mats.find(x=>x.id===id);document.getElementById('matTitle').innerText='Ссылка';
    document.getElementById('mLabel').value=m.label;document.getElementById('mUrl').value=m.url;
    document.getElementById('mNote').value=m.note||'';document.getElementById('mDel').style.display='block';
  }else{document.getElementById('matTitle').innerText='Новая ссылка';
    document.getElementById('mLabel').value='';document.getElementById('mUrl').value='';
    document.getElementById('mNote').value='';document.getElementById('mDel').style.display='none';}
  document.getElementById('ovMat').classList.add('on');setTimeout(()=>document.getElementById('mLabel').focus(),50);
}
function saveMat(auto){
  let label=document.getElementById('mLabel').value.trim();let url=document.getElementById('mUrl').value.trim();
  const note=document.getElementById('mNote').value.trim();
  if(auto){
    const old=editMatId&&state.mats.find(x=>x.id===editMatId);
    if(!old&&!label&&!url&&!note){closeOv('ovMat');return}
    if(!url&&old)url=old.url;
  }else{
    if(!label){document.getElementById('mLabel').focus();return}if(!url){document.getElementById('mUrl').focus();return}
  }
  if(url&&!/^https?:\/\//i.test(url))url='https://'+url;
  if(!label){const old=editMatId&&state.mats.find(x=>x.id===editMatId);label=old?old.label:(url?safeHost(url):'Без названия')}
  if(editMatId){const m=state.mats.find(x=>x.id===editMatId);m.label=label;m.url=url;m.note=note;}
  else{state.mats.push({id:c(),label,url,note,star:false})}
  save();closeOv('ovMat');renderMat();
}
function deleteMat(){if(!confirm('Удалить ссылку?'))return;
  state.mats=state.mats.filter(x=>x.id!==editMatId);save();closeOv('ovMat');renderMat()}
