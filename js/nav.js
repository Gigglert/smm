/* Вкладки и календарь контент-плана */

const TABS={
  plan:['tabPlan','viewPlan',()=>renderCal()],
  idea:['tabIdea','viewIdea',()=>renderSheet('ideas')],
  dev:['tabDev','viewDev',()=>renderDev()],
  mat:['tabMat','viewMat',()=>renderMat()],
  task:['tabTask','viewTask',()=>renderTask()],
  hadi:['tabHadi','viewHadi',()=>renderSheet('hadi')]};
function setTab(t){
  Object.entries(TABS).forEach(([k,[tab,view]])=>{
    document.getElementById(view).style.display=(k===t?'block':'none');
    document.getElementById(tab).classList.toggle('on',k===t)});
  TABS[t][2]();
}

const MONTHS_FULL=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_SHORT=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
function daysLeft(due){const t=new Date();t.setHours(0,0,0,0);const d=new Date(due+'T00:00:00');return Math.round((d-t)/86400000)}
function fmtShort(due){const d=new Date(due+'T00:00:00');return d.getDate()+' '+MONTHS_SHORT[d.getMonth()]}
function dueChip(due){const days=daysLeft(due);let cls='',txt=fmtShort(due);
  if(days<0){cls='over';txt='⚠ '+txt}else if(days<=2){cls='soon'}return `<span class="chip due ${cls}">${txt}</span>`}
function dkey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

let curY=new Date().getFullYear(),curM=new Date().getMonth();
function shiftMonth(d){curM+=d;if(curM<0){curM=11;curY--}if(curM>11){curM=0;curY++}renderCal()}
function renderCal(){
  document.getElementById('monthLbl').innerText=MONTHS_FULL[curM]+' '+curY;
  const cal=document.getElementById('cal');cal.innerHTML='';
  ['пн','вт','ср','чт','пт','сб','вс'].forEach(d=>{const h=document.createElement('div');h.className='dow';h.innerText=d;cal.appendChild(h)});
  const first=new Date(curY,curM,1);let lead=(first.getDay()+6)%7;
  const dim=new Date(curY,curM+1,0).getDate();const todayKey=dkey(new Date());
  for(let i=0;i<lead;i++){const e=document.createElement('div');e.className='day empty';cal.appendChild(e)}
  for(let day=1;day<=dim;day++){
    const key=`${curY}-${String(curM+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const el=document.createElement('div');el.className='day'+(key===todayKey?' today':'');
    el.innerHTML=`<span class="day-num">${day}</span>`;
    state.posts.filter(p=>p.date===key).forEach(p=>{
      const col=state.devCols.find(x=>x.id===p.col);const st=colStatus(col?col.name:'');
      const pv=document.createElement('div');pv.className='post st-'+st;
      const AB={'Telegram':'TG','Instagram':'IG','VK':'VK','MAX':'MAX','Дзен':'Дз','YouTube':'YT','Сайт':'Сайт','Рассылка':'Mail','VC':'VC','Другое':'…'};
      const chs=(p.chans||[]).map(x=>AB[x]||x).join('·')||'—';
      const rb=state.rubrics.find(r=>r.id===p.rubric);
      pv.innerHTML=`<span class="ptype">${chs} · ${esc(col?col.name:'')}</span>${esc(p.name)}`;
      if(rb){pv.style.background=rb.color+'66';pv.style.borderLeft='3px solid '+rb.color}
      pv.draggable=true;
      pv.addEventListener('dragstart',e=>{e.dataTransfer.setData('postid',p.id);pv.classList.add('dragging')});
      pv.addEventListener('dragend',()=>{pv.classList.remove('dragging')});
      pv.onclick=()=>{if(!pv.classList.contains('dragging'))openPost(p.id,null,key)};el.appendChild(pv)});
    el.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('postid')){e.preventDefault();el.classList.add('dayover')}});
    el.addEventListener('dragleave',()=>el.classList.remove('dayover'));
    el.addEventListener('drop',e=>{el.classList.remove('dayover');
      const pid=e.dataTransfer.getData('postid');if(!pid)return;e.preventDefault();
      const p=state.posts.find(x=>x.id===pid);if(p&&p.date!==key){p.date=key;save();renderCal();renderDev()}});
    const add=document.createElement('button');add.className='day-add';add.innerText='＋ пост';
    add.onclick=()=>openPost(null,null,key);el.appendChild(add);cal.appendChild(el);
  }
}
