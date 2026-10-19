/* Таблицы «Идеи» и «Гипотезы по HADI», связка идей с разработкой */
/* ── Таблицы: идеи и гипотезы HADI ── */
const sheetUI={ideas:{filters:{}},hadi:{filters:{},archived:false}};
function sheetArchCol(sh){return sh.cols.find(x=>x.role==='archive')}
function cellFilled(v){return v!==''&&v!==false&&v!=null}
function sheetVisibleRows(key){
  const sh=state[key],ui=sheetUI[key],ac=sheetArchCol(sh);
  return sh.rows.filter(r=>{
    if(ac&&!!r.cells[ac.id]!==!!ui.archived)return false;
    for(const [cid,f] of Object.entries(ui.filters)){
      if(!f)continue;const col=sh.cols.find(x=>x.id===cid);if(!col)continue;const v=r.cells[cid];
      if(col.type==='check'){if(f==='yes'&&!v)return false;if(f==='no'&&v)return false}
      else if(col.type==='select'){if(f==='__empty'){if(v)return false}else if(v!==f)return false}
    }
    return true});
}
function sheetFilterBtn(key,cid,val,label,cur){
  return `<button class="spbtn${cur===val?' on':''}" data-v="${esc(val)}" onclick="setSheetFilter('${key}','${cid}',this.dataset.v)">${esc(label)}</button>`}
function setSheetFilter(key,cid,v){sheetUI[key].filters[cid]=v;renderSheet(key)}
function setSheetArch(key,on){sheetUI[key].archived=on;renderSheet(key)}
function sheetCell(key,r,col){
  const v=r.cells[col.id],a=`'${key}','${r.id}','${col.id}'`;
  if(col.type==='check'){
    let link='';
    if(col.role==='taken'&&r.postId){const p=state.posts.find(x=>x.id===r.postId);
      if(p){const st=state.devCols.find(x=>x.id===p.col);
        link=`<button class="idea-link" onclick="openPost('${p.id}')" title="открыть пост">в разработке: ${esc(st?st.name:'—')}</button>`}}
    return `<input type="checkbox" class="ck" ${v?'checked':''} onchange="setCell(${a},this.checked,true)">${link}`}
  if(col.type==='date')return `<input type="date" class="sh-date" value="${esc(v||'')}" onchange="setCell(${a},this.value,false)">`;
  if(col.type==='select'){const opts=col.options||[];
    const cls=v==='Верно'?' ok':v==='Неверно'?' no':'';
    return `<select class="sh-sel${cls}" onchange="setCell(${a},this.value,true)"><option value="">—</option>`+
      opts.map(o=>`<option value="${esc(o)}" ${o===v?'selected':''}>${esc(o)}</option>`).join('')+
      (v&&!opts.includes(v)?`<option value="${esc(v)}" selected>${esc(v)}</option>`:'')+`</select>`}
  return `<textarea class="sh-txt" rows="1" placeholder="${esc(col.ph||'')}" oninput="autoGrow(this);setCell(${a},this.value,false)">${esc(v||'')}</textarea>`;
}
function autoGrow(el){if(!el.offsetParent)return;el.style.height='auto';el.style.height=el.scrollHeight+'px'}
function setCell(key,rid,cid,val,rerender){
  const r=state[key].rows.find(x=>x.id===rid);if(!r)return;
  r.cells[cid]=val;
  const col=state[key].cols.find(x=>x.id===cid);
  let linked=false;
  if(key==='ideas'&&col&&col.role==='taken'){ideaTaken(r,col,val);linked=true}
  if(key==='ideas'&&col&&col.role==='ctype'&&r.postId){const p=state.posts.find(x=>x.id===r.postId);if(p){p.ctype=val;linked=true}}
  save();if(rerender)renderSheet(key);if(linked){renderDev();renderCal()}
}
/* связка «Идеи» → «Разработка контента» */
function ideaTaken(r,col,on){
  const sh=state.ideas;
  const textCol=sh.cols.find(x=>x.role==='idea')||sh.cols.find(x=>x.type==='text');
  const typeCol=sh.cols.find(x=>x.role==='ctype');
  const linked=r.postId&&state.posts.find(x=>x.id===r.postId);
  if(on){
    if(linked)return;
    const txt=String((textCol&&r.cells[textCol.id])||'').trim();
    if(!txt){alert('Сначала напиши идею — из неё сделаем пост.');r.cells[col.id]=false;return}
    const stage=state.devCols[0];
    if(!stage){alert('В «Разработке контента» нет ни одной стадии — добавь колонку.');r.cells[col.id]=false;return}
    let name=txt.split('\n')[0].trim();if(name.length>80)name=name.slice(0,79)+'…';
    const p={id:c(),name,desc:txt!==name?txt:'',chans:[],rubric:'',formats:[],date:'',col:stage.id,subs:[],
      ideaId:r.id,ctype:(typeCol&&r.cells[typeCol.id])||''};
    state.posts.push(p);r.postId=p.id;
  }else{
    if(linked){
      if(confirm(`Удалить пост «${linked.name}» из разработки?\n\nОК — удалить пост.\nОтмена — пост останется в разработке.`))
        state.posts=state.posts.filter(x=>x.id!==linked.id);
      else delete linked.ideaId;
    }
    delete r.postId;
  }
}
/* пост удалили на доске — идея снова «не взята» */
function unlinkIdeas(postIds){
  const takenCol=state.ideas.cols.find(x=>x.role==='taken');
  state.ideas.rows.forEach(r=>{if(r.postId&&postIds.includes(r.postId)){delete r.postId;if(takenCol)r.cells[takenCol.id]=false}});
  renderSheet('ideas');
}
function renderSheet(key){
  const box=document.getElementById(key+'Sheet');if(!box)return;
  const sh=state[key],ui=sheetUI[key],ac=sheetArchCol(sh);
  let bar='';
  if(ac){const na=sh.rows.filter(r=>r.cells[ac.id]).length;
    bar+=`<div class="sh-bar"><button class="spbtn${!ui.archived?' on':''}" onclick="setSheetArch('${key}',false)">Активные · ${sh.rows.length-na}</button>`+
      `<button class="spbtn${ui.archived?' on':''}" onclick="setSheetArch('${key}',true)">Архив · ${na}</button></div>`}
  const fcols=sh.cols.filter(col=>col.role!=='archive'&&(col.type==='check'||col.type==='select'));
  Object.keys(ui.filters).forEach(k=>{if(!fcols.find(x=>x.id===k))delete ui.filters[k]});
  fcols.forEach(col=>{const cur=ui.filters[col.id]||'';
    let b=`<div class="sh-bar"><span class="sh-lbl">${esc(col.name)}:</span>`+sheetFilterBtn(key,col.id,'','Все',cur);
    if(col.type==='check')b+=sheetFilterBtn(key,col.id,'yes','Да',cur)+sheetFilterBtn(key,col.id,'no','Нет',cur);
    else{(col.options||[]).forEach(o=>b+=sheetFilterBtn(key,col.id,o,o,cur));b+=sheetFilterBtn(key,col.id,'__empty','не указан',cur)}
    bar+=b+'</div>'});
  const rows=sheetVisibleRows(key);
  const total=ac?sh.rows.filter(r=>!!r.cells[ac.id]===!!ui.archived).length:sh.rows.length;
  /* если ширину хоть раз тянули — фиксированная раскладка, новым столбцам ширина по умолчанию */
  const fixed=sh.cols.some(x=>x.w);
  if(fixed)sh.cols.forEach(x=>{if(!x.w)x.w=COL_W[x.type]||160});
  const tw=fixed?sh.cols.reduce((s,x)=>s+x.w,0)+RS_LAST:0;
  let h=`<div class="sh-count">Показано ${rows.length} из ${total} · тяни ⠿ — переставить столбец · тяни край заголовка — поменять ширину</div><div class="sh-wrap">`+
    `<table class="sheet${fixed?' fixed':''}"${fixed?` style="width:${tw}px"`:''}><thead><tr>`;
  sh.cols.forEach(col=>h+=`<th class="c-${col.type}"${fixed?` style="width:${col.w}px"`:''} data-c="${col.id}"`+
    ` ondragover="sheetColOver(event,this)" ondragleave="this.classList.remove('colover','after')" ondrop="sheetColDrop(event,this,'${key}','${col.id}')">`+
    `<div class="th-in"><span class="grip" draggable="true" ondragstart="sheetColDrag(event,'${key}','${col.id}')" title="тяни, чтобы переставить столбец">⠿</span>`+
    `<button class="th-btn" onclick="openSheetCol('${key}','${col.id}')" title="переименовать / удалить столбец">${esc(col.name)}<i>✎</i></button></div>`+
    `<span class="col-rs" onpointerdown="startColResize(event,'${key}','${col.id}')" ondblclick="resetColW('${key}')" title="тяни — ширина · двойной клик — сбросить все ширины"></span></th>`);
  h+=`<th style="width:${fixed?RS_LAST+'px':'1%'}"><button class="th-add" onclick="openSheetCol('${key}',null)" title="добавить столбец">＋</button></th></tr></thead><tbody>`;
  rows.forEach(r=>{h+=`<tr data-r="${r.id}">`;
    sh.cols.forEach(col=>h+=`<td class="c-${col.type}">${sheetCell(key,r,col)}</td>`);
    h+=`<td class="c-del"><button class="rx" onclick="delSheetRow('${key}','${r.id}')" title="удалить строку">✕</button></td></tr>`});
  if(!rows.length){const msg=ui.archived&&!total?'В архиве пока пусто':!total?'Пока пусто — добавь первую строку':'Под фильтр ничего не попало';
    h+=`<tr><td colspan="${sh.cols.length+1}" class="sh-empty">${msg}</td></tr>`}
  h+='</tbody></table></div>';
  if(!ui.archived)h+=`<button class="addcard sh-addrow" onclick="addSheetRow('${key}')">＋ строка</button>`;
  box.innerHTML=bar+h;
  box.querySelectorAll('.sh-txt').forEach(autoGrow);
  box.onclick=sheetCellClick;
}
/* клик по пустому месту ячейки — как клик по самому полю */
function sheetCellClick(e){
  const td=e.target.closest('td');if(!td||e.target!==td||td.classList.contains('c-del'))return;
  const el=td.querySelector('textarea,select,input');if(!el)return;
  if(el.type==='checkbox'){el.click();return}
  el.focus();
  if(el.tagName==='TEXTAREA'){const n=el.value.length;el.setSelectionRange(n,n)}
  else if(el.showPicker){try{el.showPicker()}catch(_){}}
}
/* перестановка столбцов перетаскиванием за ⠿ */
function sheetColDrag(e,key,cid){e.dataTransfer.setData('sheetcol',key+'|'+cid);e.dataTransfer.effectAllowed='move'}
function sheetColOver(e,th){
  if(!e.dataTransfer.types.includes('sheetcol'))return;e.preventDefault();
  const r=th.getBoundingClientRect();th.classList.add('colover');th.classList.toggle('after',e.clientX>r.left+r.width/2);
}
function sheetColDrop(e,th,key,targetId){
  const after=th.classList.contains('after');th.classList.remove('colover','after');
  const [k,cid]=(e.dataTransfer.getData('sheetcol')||'').split('|');if(k!==key||!cid)return;e.preventDefault();
  moveSheetCol(key,cid,targetId,after);
}
function moveSheetCol(key,cid,targetId,after){
  const cols=state[key].cols;if(cid===targetId)return;
  const from=cols.findIndex(x=>x.id===cid);if(from<0)return;
  const [m]=cols.splice(from,1);
  let to=cols.findIndex(x=>x.id===targetId);if(to<0){cols.splice(from,0,m);return}
  cols.splice(after?to+1:to,0,m);
  save();renderSheet(key);
}
/* сдвиг из окна столбца — работает и на телефоне */
function shiftSheetCol(dir){
  const cols=state[colKey].cols,i=cols.findIndex(x=>x.id===colEditId),j=i+dir;
  if(i<0||j<0||j>=cols.length)return;
  [cols[i],cols[j]]=[cols[j],cols[i]];save();renderSheet(colKey);
}
const COL_W={check:110,text:260,select:160,date:170},RS_LAST=46;
function startColResize(e,key,cid){
  e.preventDefault();e.stopPropagation();
  const handle=e.currentTarget,table=handle.closest('table'),ths=[...table.querySelectorAll('thead th')];
  const sh=state[key],col=sh.cols.find(x=>x.id===cid);if(!col)return;
  /* первое перетаскивание: запоминаем текущие ширины всех столбцов */
  if(!sh.cols.every(x=>x.w))sh.cols.forEach((x,i)=>x.w=Math.round(ths[i].getBoundingClientRect().width));
  const apply=()=>{let sum=0;sh.cols.forEach((x,i)=>{ths[i].style.width=x.w+'px';sum+=x.w});
    ths[ths.length-1].style.width=RS_LAST+'px';table.classList.add('fixed');table.style.width=(sum+RS_LAST)+'px'};
  apply();handle.classList.add('on');
  const x0=e.clientX,w0=col.w;
  const move=ev=>{col.w=Math.max(60,Math.round(w0+ev.clientX-x0));apply();table.querySelectorAll('.sh-txt').forEach(autoGrow)};
  const up=()=>{removeEventListener('pointermove',move);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);
    handle.classList.remove('on');save()};
  addEventListener('pointermove',move);addEventListener('pointerup',up);addEventListener('pointercancel',up);
}
function resetColW(key){state[key].cols.forEach(x=>delete x.w);save();renderSheet(key)}
function addSheetRow(key){
  const sh=state[key],ui=sheetUI[key],cells={};
  /* новая строка сразу подходит под включённые фильтры, чтобы не исчезла */
  Object.entries(ui.filters).forEach(([cid,f])=>{if(!f)return;const col=sh.cols.find(x=>x.id===cid);if(!col)return;
    if(col.type==='check')cells[cid]=(f==='yes');else if(col.type==='select'&&f!=='__empty')cells[cid]=f});
  const id=c();sh.rows.push({id,cells});save();renderSheet(key);
  const t=document.querySelector(`#${key}Sheet tr[data-r="${id}"] .sh-txt`);if(t)t.focus();
}
function delSheetRow(key,rid){
  const sh=state[key],r=sh.rows.find(x=>x.id===rid);if(!r)return;
  const p=r.postId&&state.posts.find(x=>x.id===r.postId);
  if(Object.values(r.cells).some(cellFilled)&&!confirm(p?'Удалить идею? Пост в разработке останется.':'Удалить строку?'))return;
  if(p){delete p.ideaId;renderDev()}
  sh.rows=sh.rows.filter(x=>x.id!==rid);save();renderSheet(key);
}
let colKey=null,colEditId=null;
function openSheetCol(key,cid){
  colKey=key;colEditId=cid;const col=cid?state[key].cols.find(x=>x.id===cid):null;
  document.getElementById('colTitle').innerText=col?'Столбец':'Новый столбец';
  document.getElementById('cName').value=col?col.name:'';
  const ty=document.getElementById('cType');ty.value=col?col.type:'text';ty.disabled=!!col;
  document.getElementById('cOpts').value=col&&col.options?col.options.join('\n'):'';
  document.getElementById('cDel').style.display=col&&col.role!=='archive'?'block':'none';
  document.getElementById('cMoveBox').style.display=col?'block':'none';
  toggleColOpts();
  document.getElementById('ovCol').classList.add('on');setTimeout(()=>document.getElementById('cName').focus(),50);
}
function toggleColOpts(){document.getElementById('cOptsBox').style.display=document.getElementById('cType').value==='select'?'block':'none'}
function saveSheetCol(auto){
  const sh=state[colKey],col=colEditId?sh.cols.find(x=>x.id===colEditId):null;
  let name=document.getElementById('cName').value.trim();
  if(!name){if(!auto){document.getElementById('cName').focus();return}if(!col){closeOv('ovCol');return}name=col.name}
  const type=col?col.type:document.getElementById('cType').value;
  const options=document.getElementById('cOpts').value.split('\n').map(s=>s.trim()).filter(Boolean);
  if(type==='select'&&!options.length&&!auto){document.getElementById('cOpts').focus();return}
  if(col){col.name=name;if(type==='select')col.options=options}
  else{const n={id:c(),name,type};if(type==='select')n.options=options;sh.cols.push(n)}
  save();closeOv('ovCol');renderSheet(colKey);
}
function deleteSheetCol(){
  const sh=state[colKey],col=sh.cols.find(x=>x.id===colEditId);if(!col||col.role==='archive')return;
  if(sh.cols.filter(x=>x.role!=='archive').length<=1){alert('Нужен хотя бы один столбец');return}
  const filled=sh.rows.filter(r=>cellFilled(r.cells[col.id])).length;
  if(!confirm(`Удалить столбец «${col.name}»?`+(filled?` Данные в нём (строк: ${filled}) пропадут — вернуть можно через «История».`:'')))return;
  sh.cols=sh.cols.filter(x=>x.id!==col.id);sh.rows.forEach(r=>delete r.cells[col.id]);
  save();closeOv('ovCol');renderSheet(colKey);
}
