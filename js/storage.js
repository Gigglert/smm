/* Хранилище: localStorage, облако Supabase, история версий, файл-копия */
/* ── Хранилище v7: без затираний, с историей ── */
const SB_URL = "https://jjkysewwwqpsnttnqbzb.supabase.co";
const SB_KEY = "sb_publishable_lU-nlWKkQDCcKzFXo_EoeQ_FKRBD8qI";
const SB_HEADERS = { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json" };
const ROW = SB_URL + "/rest/v1/planner_data?id=eq.rin";
const HISTURL = SB_URL + "/rest/v1/planner_history";

let cloudReady=false, remoteStamp=null, saveTimer=null, dirty=false, lastHist=0, lastLocalHist=0;

function renderAll(){renderCal();renderDev();renderTask();renderMat();renderSheet('ideas');renderSheet('hadi')}
function setSync(txt,cls){const b=document.getElementById('syncBadge');if(b){b.innerText=txt;b.className='sync '+(cls||'')}}

/* локальная история — кольцо из 8 снимков в браузере */
function pushLocal(note,force){
  if(!force && Date.now()-lastLocalHist<60000) return;
  lastLocalHist=Date.now();
  try{
    const h=JSON.parse(localStorage.getItem('getit_hist')||'[]');
    h.unshift({t:Date.now(),note:note,n:(state.posts||[]).length,data:state});
    while(h.length>8)h.pop();
    localStorage.setItem('getit_hist',JSON.stringify(h));
  }catch(e){try{localStorage.setItem('getit_hist','[]')}catch(_){}}
}
function save(){
  localStorage.setItem('getit_sky',JSON.stringify(state));
  pushLocal('правка');
  dirty=true;setSync('сохраняю…','');
  clearTimeout(saveTimer);saveTimer=setTimeout(saveCloud,1200);
}

/* запись в облако: только если убедились, что там ничего не изменилось */
function saveCloud(){
  if(!cloudReady){setSync('только на этом устройстве','warn');return}
  fetch(ROW+"&select=updated_at",{headers:SB_HEADERS,cache:'no-store'})
   .then(r=>r.ok?r.json():Promise.reject(0))
   .then(rows=>{
      const cur=rows&&rows[0]?rows[0].updated_at:null;
      if(remoteStamp&&cur&&cur!==remoteStamp){showConflict();return null}
      return fetch(ROW,{method:'PATCH',headers:Object.assign({},SB_HEADERS,{'Prefer':'return=representation'}),
        body:JSON.stringify({data:state,updated_at:new Date().toISOString()})}).then(r=>r.json());
   })
   .then(back=>{
      if(!back)return;
      if(back[0]&&back[0].updated_at)remoteStamp=back[0].updated_at;
      dirty=false;setSync('сохранено в облаке','ok');
      pushCloudHistory();
   })
   .catch(()=>{setSync('нет связи — правки только тут','warn')});
}

/* чтение из облака: никогда не затирает несохранённые правки */
function loadCloud(){
  return fetch(ROW+"&select=data,updated_at",{headers:SB_HEADERS,cache:'no-store'})
   .then(r=>r.ok?r.json():Promise.reject(0))
   .then(rows=>{
      if(!rows||!rows[0])return;
      const fresh=rows[0].updated_at;
      if(dirty){cloudReady=true;if(remoteStamp&&fresh!==remoteStamp){showConflict()}return}
      remoteStamp=fresh;
      if(rows[0].data&&rows[0].data.posts){
        state=normalizeState(rows[0].data);
        localStorage.setItem('getit_sky',JSON.stringify(state));
        pushLocal('из облака',true);renderAll();
      }
      cloudReady=true;setSync('синхронизировано','ok');
   })
   .catch(()=>{cloudReady=false;setSync('нет связи с облаком','warn')});
}

/* снимки в облаке — не чаще раза в 2 минуты */
function pushCloudHistory(){
  if(Date.now()-lastHist<120000)return;
  lastHist=Date.now();
  fetch(HISTURL,{method:'POST',headers:Object.assign({},SB_HEADERS,{'Prefer':'return=minimal'}),
    body:JSON.stringify({data:state})}).catch(()=>{});
}

/* конфликт: две версии — решает человек, ничего не пропадает */
function showConflict(){
  setSync('облако изменилось','bad');
  const el=document.getElementById('conflictBar');if(el)el.style.display='flex';
}
function conflictTakeCloud(){
  pushLocal('моя версия перед заменой',true);
  dirty=false;document.getElementById('conflictBar').style.display='none';
  loadCloud();
}
function conflictKeepMine(){
  fetch(ROW+"&select=data,updated_at",{headers:SB_HEADERS,cache:'no-store'})
   .then(r=>r.json()).then(rows=>{
      if(rows&&rows[0]){
        try{const h=JSON.parse(localStorage.getItem('getit_hist')||'[]');
          h.unshift({t:Date.now(),note:'облачная версия перед перезаписью',n:(rows[0].data.posts||[]).length,data:rows[0].data});
          while(h.length>8)h.pop();localStorage.setItem('getit_hist',JSON.stringify(h))}catch(e){}
        remoteStamp=rows[0].updated_at;
      }
      document.getElementById('conflictBar').style.display='none';
      saveCloud();
   });
}

/* восстановление */
function openHistory(){
  const box=document.getElementById('histList');
  box.innerHTML='<div style="color:var(--dusk-soft);font-size:13px">Загружаю…</div>';
  document.getElementById('ovHist').classList.add('on');
  const loc=(()=>{try{return JSON.parse(localStorage.getItem('getit_hist')||'[]')}catch(e){return[]}})();
  let html='';
  if(loc.length){html+='<div class="hist-h">На этом устройстве</div>';
    loc.forEach((s,i)=>{html+=histRow(new Date(s.t).toLocaleString('ru-RU'),s.note+' · '+s.n+' постов','local',i)})}
  fetch(HISTURL+"?select=id,created_at,data&order=created_at.desc&limit=40",{headers:SB_HEADERS,cache:'no-store'})
   .then(r=>r.ok?r.json():[])
   .then(rows=>{
      if(rows&&rows.length){html+='<div class="hist-h">Снимки в облаке</div>';
        rows.forEach(s=>{const n=(s.data&&s.data.posts?s.data.posts.length:0);
          html+=histRow(new Date(s.created_at).toLocaleString('ru-RU'),n+' постов','cloud',s.id)})}
      else if(!loc.length){html='<div style="color:var(--dusk-soft);font-size:13px">Снимков пока нет — они появятся после ближайших правок.</div>'}
      box.innerHTML=html;
   }).catch(()=>{box.innerHTML=html||'<div style="color:var(--dusk-soft)">Снимков нет</div>'});
}
function histRow(when,what,kind,id){
  return '<div class="hist-row"><div><b>'+when+'</b><div style="font-size:12px;color:var(--dusk-soft)">'+what+'</div></div>'+
    '<button class="btn save" style="flex:none;padding:8px 14px;font-size:13px" onclick="restoreFrom(\''+kind+'\',\''+id+'\')">Восстановить</button></div>';
}
function restoreFrom(kind,id){
  if(!confirm('Восстановить эту версию? Текущая сохранится в истории, её можно будет вернуть.'))return;
  pushLocal('перед восстановлением',true);
  if(kind==='local'){
    const h=JSON.parse(localStorage.getItem('getit_hist')||'[]');
    const s=h[parseInt(id)];if(!s)return;
    state=normalizeState(s.data);applyRestored();
  }else{
    fetch(HISTURL+"?id=eq."+id+"&select=data",{headers:SB_HEADERS,cache:'no-store'})
     .then(r=>r.json()).then(rows=>{if(rows&&rows[0]){state=normalizeState(rows[0].data);applyRestored()}});
  }
}
function applyRestored(){
  localStorage.setItem('getit_sky',JSON.stringify(state));
  renderAll();closeOv('ovHist');
  dirty=true;saveCloud();
}

/* файл-копия */
function exportJSON(){
  const b=new Blob([JSON.stringify(state,null,1)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);
  a.download='planner-'+new Date().toISOString().slice(0,10)+'.json';a.click();
}
function importJSON(ev){
  const f=ev.target.files[0];if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{try{
      const d=JSON.parse(rd.result);
      if(!d.posts){alert('Это не похоже на копию планера');return}
      if(!confirm('Заменить текущие данные содержимым файла? Текущее уйдёт в историю.'))return;
      pushLocal('перед загрузкой из файла',true);
      state=normalizeState(d);applyRestored();
    }catch(e){alert('Файл не читается')}};
  rd.readAsText(f);ev.target.value='';
}
