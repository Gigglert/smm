/* Данные: каналы, рубрики, значения по умолчанию, загрузка состояния */
const CHANNELS = ['Telegram','VK','Instagram','MAX','VC','Дзен','YouTube','Сайт','Рассылка','Другое'];
function c(){return 'id'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3)}
const RUB_COLORS=['#7fb5a3','#e8a06a','#e3c25f','#7f9fd0','#d78fa5','#f0d98a','#d97b6c','#c9b6d9','#8fbf8f','#9dc8c0'];
function defFormats(){return ['reels','пост','сторис','карточки','док','статья','опрос','кружочек','видео/гифка']}
function defRubrics(){return [
  {id:'rb-product',name:'Продукт',color:'#7fb5a3'},
  {id:'rb-polza',name:'Польза',color:'#e8a06a'},
  {id:'rb-case',name:'Кейс',color:'#e3c25f'},
  {id:'rb-qa',name:'Вопрос-ответ',color:'#7f9fd0'},
  {id:'rb-insight',name:'Инсайт',color:'#d78fa5'},
  {id:'rb-anons',name:'Анонс',color:'#f0d98a'},
  {id:'rb-info',name:'Инфоповод',color:'#d97b6c'},
  {id:'rb-comm',name:'Коммьюнити',color:'#c9b6d9'},
  {id:'rb-interview',name:'Интервью',color:'#8fbf8f'},
  {id:'rb-team',name:'Команда',color:'#9dc8c0'}]}
function defSprints(){return[{id:'sp-backlog',name:'Бэклог'}]}
function defIdeas(){return{cols:[
  {id:'taken',name:'Взято в работу',type:'check',role:'taken'},
  {id:'idea',name:'Идея',type:'text',role:'idea'},
  {id:'ctype',name:'Тип контента',type:'select',role:'ctype',options:['Инфо','Вовлечение','Продажа','Экспертиза']}],rows:[]}}
function defHadi(){return{cols:[
  {id:'arch',name:'Архив',type:'check',role:'archive'},
  {id:'hyp',name:'Гипотеза',type:'text',ph:'Если мы сделаем А, то получим Б'},
  {id:'act',name:'Действие',type:'text',ph:'Что делаем для проверки'},
  {id:'data',name:'Данные',type:'text',ph:'Какие данные собираем'},
  {id:'concl',name:'Выводы',type:'text',ph:'Какой итог получили'},
  {id:'start',name:'Дата взятия в работу',type:'date'},
  {id:'end',name:'Дата завершения',type:'date'},
  {id:'res',name:'Результат',type:'select',options:['Верно','Неверно']}],rows:[]}}
function normalizeSheet(sh,def){
  if(!sh||!Array.isArray(sh.cols))sh=def();
  if(!Array.isArray(sh.rows))sh.rows=[];
  sh.rows.forEach(r=>{if(!r.cells)r.cells={}});
  return sh;
}
function normalizeState(s){
  if(!s)return s;
  s.ideas=normalizeSheet(s.ideas,defIdeas);
  s.ideas.cols.forEach(x=>{if(!x.role&&['taken','idea','ctype'].includes(x.id))x.role=x.id});
  s.hadi=normalizeSheet(s.hadi,defHadi);
  if(!s.hadi.cols.find(x=>x.role==='archive'))s.hadi.cols.unshift(defHadi().cols[0]);
  if(!s.rubrics||!s.rubrics.length)s.rubrics=defRubrics();
  if(!s.formats||!s.formats.length)s.formats=defFormats();
  if(!s.sprints||!s.sprints.length)s.sprints=defSprints();
  if(!s.activeSprint||!s.sprints.find(x=>x.id===s.activeSprint))s.activeSprint=s.sprints[0].id;
  (s.posts||[]).forEach(p=>{
    if(!p.chans)p.chans=p.chan?[p.chan]:[];
    delete p.chan;
    if(p.rubric===undefined)p.rubric='';
    if(!p.formats)p.formats=[];
  });
  (s.tasks||[]).forEach(t=>{
    if(!t.subs)t.subs=[];
    if(t.sprint===undefined||!s.sprints.find(x=>x.id===t.sprint))t.sprint=s.sprints[0].id;
  });
  return s;
}
function defDevCols(){return[
  {id:c(),name:'Идея'},{id:c(),name:'Проработка'},{id:c(),name:'Сбор фактуры'},
  {id:c(),name:'В работе'},{id:c(),name:'Согласование'},{id:c(),name:'Готово'}]}
function defTaskCols(){return[{id:c(),name:'Нужно сделать'},{id:c(),name:'В процессе'},{id:c(),name:'Готово'}]}
function colStatus(name){const n=(name||'').toLowerCase();
  if(n.includes('готов'))return 'done';if(n.includes('идея'))return 'idea';return 'work'}
function defMats(){return[
  {id:c(),label:'MAX — Get it',url:'https://web.max.ru/-71877105846822',note:'Наш канал в мессенджере MAX',star:true},
  {id:c(),label:'ВКонтакте — Get it Rest',url:'https://vk.ru/getit_rest',note:'Сообщество во ВКонтакте',star:true},
  {id:c(),label:'Instagram — get_it_rest',url:'https://www.instagram.com/get_it_rest',note:'Профиль в Instagram',star:true},
  {id:c(),label:'Telegram — getitrest',url:'https://t.me/getitrest',note:'Наш Telegram-канал',star:true},
  {id:c(),label:'VC.RU — Get it',url:'https://vc.ru/u/2061907-get-it',note:'Профиль и статьи на VC.RU',star:true}]}

function load(){try{return JSON.parse(localStorage.getItem('getit_sky'))}catch(e){return null}}

let state = normalizeState(load() || {devCols:defDevCols(),posts:[],taskCols:defTaskCols(),tasks:[],mats:defMats()});
state.devCols=state.devCols||defDevCols();state.posts=state.posts||[];
state.taskCols=state.taskCols||defTaskCols();state.tasks=state.tasks||[];state.mats=state.mats||defMats();
