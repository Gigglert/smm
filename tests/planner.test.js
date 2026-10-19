// Автопроверки планера: открывают index.html в настоящем браузере (Chromium)
// и прокликивают функции так, как это делает человек.
// Облако Supabase в проверках отключено — реальные данные не трогаются.
// Запуск: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const PAGE_URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let browser;

before(async () => {
  const opts = {};
  if (process.env.CHROMIUM_PATH) opts.executablePath = process.env.CHROMIUM_PATH;
  browser = await chromium.launch(opts);
});
after(async () => { await browser.close(); });

/* Новая чистая вкладка. answers — ответы на confirm/prompt по очереди (true = ОК, строка — текст для prompt).
   cloud — что вернёт «облако» на чтение (по умолчанию облако недоступно). */
async function open({ width = 1300, height = 900, answers = [], cloud = null } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  const dialogs = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => {
    dialogs.push(d.message());
    const a = answers.length ? answers.shift() : true;
    if (a === false) d.dismiss(); else d.accept(typeof a === 'string' ? a : undefined);
  });
  await page.route(/supabase\.co/, route => {
    const req = route.request();
    if (cloud && req.method() === 'GET' && req.url().includes('planner_data')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ data: cloud, updated_at: '2026-01-01T00:00:00Z' }]) });
    }
    return route.abort();
  });
  await page.goto(PAGE_URL);
  return { page, errors, dialogs, close: () => context.close() };
}
const state = (page, fn) => page.evaluate(fn);
const headers = (page, sheet) =>
  page.$$eval(`#${sheet}Sheet th .th-btn`, b => b.map(x => x.textContent.replace('✎', '').trim()));
const row = (page, sheet, i) => page.locator(`#${sheet}Sheet tbody tr[data-r]`).nth(i);

test('страница открывается без ошибок, вкладки в нужном порядке', async () => {
  const { page, errors, close } = await open();
  const tabs = await page.$$eval('.tabs button', b => b.map(x => x.textContent.trim()));
  assert.deepEqual(tabs, ['Контент-план', 'Разработка контента (стадии)', 'Ресурсы', 'Доска задач', 'Идеи', 'Гипотезы по HADI']);
  for (const t of ['#tabDev', '#tabMat', '#tabTask', '#tabIdea', '#tabHadi', '#tabPlan']) await page.click(t);
  await page.waitForFunction(() => document.getElementById('syncBadge').innerText.includes('нет связи'));
  assert.deepEqual(errors, []);
  await close();
});

test('данные из облака подгружаются и показываются в календаре', async () => {
  const today = new Date(); const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const cloud = { posts: [{ id: 'p1', name: 'Пост из облака', desc: '', chans: [], rubric: '', formats: [], date: key, col: 'c1', subs: [] }],
    devCols: [{ id: 'c1', name: 'Идея' }], taskCols: [{ id: 't1', name: 'Нужно сделать' }], tasks: [], mats: [] };
  const { page, errors, close } = await open({ cloud });
  await page.waitForSelector('#cal .post >> text=Пост из облака');
  await page.waitForFunction(() => document.getElementById('syncBadge').innerText.includes('синхронизировано'));
  assert.deepEqual(errors, []);
  await close();
});

test('клик мимо карточки поста сохраняет её, пустая новая карточка не сохраняется', async () => {
  const { page, close } = await open();
  await page.click('#tabDev');
  await page.click('#devBoard .addcard');
  await page.fill('#pName', 'Рилс про кофе');
  await page.fill('#pSubNew', 'написать сценарий'); // не нажали Enter — шаг всё равно должен сохраниться
  await page.mouse.click(5, 5);
  assert.equal(await page.isVisible('#ovPost'), false);
  assert.deepEqual(await state(page, () => state.posts.map(p => [p.name, p.subs.length])), [['Рилс про кофе', 1]]);
  await page.click('#devBoard .addcard');
  await page.mouse.click(5, 5);
  assert.equal(await state(page, () => state.posts.length), 1);
  await close();
});

test('Esc в карточке задачи сохраняет её', async () => {
  const { page, close } = await open();
  await page.click('#tabTask');
  await page.click('#taskBoard .addcard');
  await page.fill('#kName', 'Согласовать бриф');
  await page.keyboard.press('Escape');
  assert.deepEqual(await state(page, () => state.tasks.map(t => t.name)), ['Согласовать бриф']);
  await close();
});

test('идеи: строки, фильтры по галке и по типу контента', async () => {
  const { page, close } = await open();
  await page.click('#tabIdea');
  for (const t of ['идея 1', 'идея 2', 'идея 3']) { await page.click('#ideasSheet .sh-addrow'); await page.keyboard.type(t); }
  await row(page, 'ideas', 1).locator('select').selectOption('Экспертиза');
  await page.click('#ideasSheet .spbtn[data-v="Экспертиза"]');
  assert.deepEqual(await page.$$eval('#ideasSheet tbody tr[data-r] textarea', t => t.map(x => x.value)), ['идея 2']);
  await page.click('#ideasSheet .spbtn[data-v="__empty"]');
  assert.equal(await page.locator('#ideasSheet tbody tr[data-r]').count(), 2);
  await close();
});

test('столбцы: добавить, удалить, переставить, поменять ширину — и всё сохраняется', async () => {
  const { page, close } = await open();
  await page.click('#tabIdea');
  await page.click('#ideasSheet .th-add');
  await page.fill('#cName', 'Площадка');
  await page.selectOption('#cType', 'select');
  await page.fill('#cOpts', 'TG\nVK');
  await page.click('#ovCol .btn.save');
  assert.deepEqual(await headers(page, 'ideas'), ['Взято в работу', 'Идея', 'Тип контента', 'Площадка']);
  assert.ok(await page.isVisible('#ideasSheet .spbtn[data-v="VK"]'), 'у нового столбца-списка появился фильтр');

  await page.click('#ideasSheet th .th-btn >> text=Тип контента');
  await page.click('#cDel');
  assert.deepEqual(await headers(page, 'ideas'), ['Взято в работу', 'Идея', 'Площадка']);

  const th = i => page.locator('#ideasSheet thead th').nth(i);
  const box = await th(2).boundingBox();
  await th(0).locator('.grip').dragTo(th(2), { targetPosition: { x: box.width - 10, y: box.height / 2 } });
  assert.deepEqual(await headers(page, 'ideas'), ['Идея', 'Площадка', 'Взято в работу']);

  await page.click('#ideasSheet th .th-btn >> text=Площадка');
  await page.click('#cMoveBox button >> text=левее');
  await page.mouse.click(5, 5);
  assert.deepEqual(await headers(page, 'ideas'), ['Площадка', 'Идея', 'Взято в работу']);

  const h = await th(1).locator('.col-rs').boundingBox();
  const w0 = (await th(1).boundingBox()).width;
  await page.mouse.move(h.x + 4, h.y + h.height / 2); await page.mouse.down();
  await page.mouse.move(h.x + 154, h.y + h.height / 2, { steps: 6 }); await page.mouse.up();
  const w1 = (await th(1).boundingBox()).width;
  assert.ok(Math.abs(w1 - w0 - 150) <= 2, `столбец расширился на 150px (было ${w0}, стало ${w1})`);

  await page.reload(); await page.click('#tabIdea');
  assert.deepEqual(await headers(page, 'ideas'), ['Площадка', 'Идея', 'Взято в работу']);
  assert.ok(Math.abs((await th(1).boundingBox()).width - w1) <= 2, 'ширина сохранилась после перезагрузки');
  await close();
});

test('клик по пустому месту ячейки ставит курсор в поле', async () => {
  const { page, close } = await open();
  await page.click('#tabHadi');
  await page.click('#hadiSheet .sh-addrow');
  await page.keyboard.type('Длинная гипотеза, которая займёт несколько строк, чтобы строка стала высокой и в соседних ячейках было пустое место');
  const td = row(page, 'hadi', 0).locator('td').nth(2);
  const b = await td.boundingBox();
  await page.mouse.click(b.x + b.width - 5, b.y + b.height - 4);
  assert.equal(await page.evaluate(() => document.activeElement.placeholder), 'Что делаем для проверки');
  await close();
});

test('HADI: галка «Архив» убирает гипотезу в архив, снятие галки возвращает', async () => {
  const { page, close } = await open();
  await page.click('#tabHadi');
  for (const t of ['первая', 'вторая']) { await page.click('#hadiSheet .sh-addrow'); await page.keyboard.type(t); }
  await row(page, 'hadi', 0).locator('.ck').click();
  assert.equal(await page.locator('#hadiSheet tbody tr[data-r]').count(), 1);
  await page.click('#hadiSheet .spbtn >> text=Архив');
  assert.equal(await row(page, 'hadi', 0).locator('textarea').first().inputValue(), 'первая');
  await row(page, 'hadi', 0).locator('.ck').click();
  await page.click('#hadiSheet .spbtn >> text=Активные');
  assert.equal(await page.locator('#hadiSheet tbody tr[data-r]').count(), 2);
  assert.ok((await page.innerText('#hadiSheet .rules, #viewHadi .rules')).includes('если мы сделаем А, то получим Б'));
  await close();
});

test('связка идей с разработкой: галка создаёт пост, тип переносится, снятие и удаление работают', async () => {
  const { page, dialogs, close } = await open({ answers: [true, true] });
  await page.click('#tabIdea');
  await page.click('#ideasSheet .sh-addrow');
  await row(page, 'ideas', 0).locator('.ck').click();
  assert.match(dialogs.pop(), /Сначала напиши идею/);
  assert.equal(await state(page, () => state.posts.length), 0);

  await row(page, 'ideas', 0).locator('textarea').fill('Рилс про утренний кофе\nс деталями');
  await row(page, 'ideas', 0).locator('select').selectOption('Вовлечение');
  await row(page, 'ideas', 0).locator('.ck').click();
  let posts = await state(page, () => state.posts.map(p => ({ name: p.name, ctype: p.ctype, stage: state.devCols.find(c => c.id === p.col).name })));
  assert.deepEqual(posts, [{ name: 'Рилс про утренний кофе', ctype: 'Вовлечение', stage: 'Идея' }]);
  assert.equal(await row(page, 'ideas', 0).locator('.idea-link').innerText(), 'в разработке: Идея');

  await row(page, 'ideas', 0).locator('select').selectOption('Продажа');
  assert.equal(await state(page, () => state.posts[0].ctype), 'Продажа');

  await row(page, 'ideas', 0).locator('.ck').click(); // снять → ОК → пост удаляется
  assert.equal(await state(page, () => state.posts.length), 0);

  await row(page, 'ideas', 0).locator('.ck').click(); // снова взять
  const id = await state(page, () => state.posts[0].id);
  await page.evaluate(i => openPost(i), id);
  await page.click('#pDel'); // удалили пост на доске → галка в идеях снялась
  assert.deepEqual(await state(page, () => [state.posts.length, state.ideas.rows[0].cells.taken]), [0, false]);
  await close();
});

test('карточку задачи можно скопировать в другой спринт', async () => {
  const { page, close } = await open({ answers: ['Спринт 2'] });
  await page.click('#tabTask');
  await page.click('#taskBoard .addcard');
  await page.fill('#kName', 'Снять рилс');
  await page.fill('#kSubNew', 'сценарий');
  await page.click('#ovTask .btn.save');
  await page.click('.spbtn.add');
  await page.click('.spbtn >> text=Бэклог');
  await page.click('#taskBoard .card');
  await page.selectOption('#kCopySprint', { label: 'Спринт 2' });
  await page.click('#kCopyBox button');
  assert.match(await page.innerText('#kCopyMsg'), /Спринт 2/);
  await page.keyboard.press('Escape');
  const tasks = await state(page, () => state.tasks.map(t => [t.name, state.sprints.find(s => s.id === t.sprint).name, t.subs.length]));
  assert.deepEqual(tasks, [['Снять рилс', 'Бэклог', 1], ['Снять рилс', 'Спринт 2', 1]]);
  await close();
});

test('спринт можно убрать в архив, посмотреть и вернуть; последний активный — нельзя', async () => {
  // ответы по очереди: предупреждение «нельзя», название нового спринта, подтверждение архива
  const { page, dialogs, close } = await open({ answers: [true, 'Спринт 2', true] });
  await page.click('#tabTask');
  const chips = () => page.$$eval('#sprintBar .spbtn:not(.add)', b => b.map(x => x.textContent));
  await page.click('#sprintBar .sp-edit >> text=в архив');
  assert.match(dialogs.pop(), /единственный активный/);

  await page.click('#taskBoard .addcard'); await page.fill('#kName', 'Задача бэклога'); await page.click('#ovTask .btn.save');
  await page.click('.spbtn.add >> text=спринт');            // Спринт 2, он становится выбранным
  await page.click('.spbtn >> text=Бэклог');
  await page.click('#sprintBar .sp-edit >> text=в архив');  // confirm → ОК
  assert.deepEqual(await chips(page), ['Спринт 2', 'Архив · 1']);
  assert.equal(await page.locator('#taskBoard .card').count(), 0, 'карточки архивного спринта не видны среди активных');

  await page.click('.spbtn >> text=Архив · 1');
  assert.equal(await page.textContent('#sprintBar .sprint-lbl'), 'Архив спринтов');
  assert.equal(await page.locator('#taskBoard .card >> text=Задача бэклога').count(), 1, 'в архиве карточки на месте');

  await page.click('#taskBoard .addcard'); await page.keyboard.press('Escape');
  await page.click('#taskBoard .card'); // в окне задачи архивный спринт подписан, копировать в него нельзя
  assert.ok((await page.$$eval('#kSprint option', o => o.map(x => x.textContent))).includes('Бэклог (архив)'));
  assert.deepEqual(await page.$$eval('#kCopySprint option', o => o.map(x => x.textContent)), ['Спринт 2']);
  await page.keyboard.press('Escape');

  await page.click('.spbtn >> text=вернуть из архива');
  assert.deepEqual(await chips(page), ['Бэклог · 1', 'Спринт 2']);
  await page.reload(); await page.click('#tabTask');
  assert.deepEqual(await chips(page), ['Бэклог · 1', 'Спринт 2'], 'после перезагрузки всё на месте');
  await close();
});

test('данные сохраняются после перезагрузки страницы', async () => {
  const { page, close } = await open();
  await page.click('#tabHadi');
  await page.click('#hadiSheet .sh-addrow');
  await page.keyboard.type('гипотеза');
  await page.reload();
  assert.equal(await state(page, () => state.hadi.rows[0].cells.hyp), 'гипотеза');
  await close();
});

test('на телефоне нет горизонтальной прокрутки страницы', async () => {
  const { page, close } = await open({ width: 390, height: 800 });
  for (const t of ['#tabPlan', '#tabDev', '#tabTask', '#tabIdea', '#tabHadi']) {
    await page.click(t);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `вкладка ${t}`);
  }
  await close();
});
