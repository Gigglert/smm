/* Общие помощники, закрытие окон с сохранением и запуск приложения.
   Подключается последним: запрос к облаку идёт, когда все части уже загружены. */
function closeOv(id){document.getElementById(id).classList.remove('on')}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
/* клик мимо карточки или Esc — сохраняем, а не выбрасываем правки */
const OV_SAVE={ovPost:()=>savePost(true),ovTask:()=>saveTask(true),ovMat:()=>saveMat(true),ovCol:()=>saveSheetCol(true)};
function softClose(id){const f=OV_SAVE[id];if(f)f();else closeOv(id)}
let ovDown=null;
document.querySelectorAll('.ov').forEach(o=>{
  o.addEventListener('mousedown',e=>{ovDown=e.target});
  o.addEventListener('click',e=>{if(e.target===o&&ovDown===o)softClose(o.id)})});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.ov.on').forEach(o=>softClose(o.id))});

renderCal();

/* пересинхронизация при возвращении в приложение */
document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadCloud()});
window.addEventListener('focus',()=>loadCloud());
window.addEventListener('online',()=>loadCloud());
loadCloud();
