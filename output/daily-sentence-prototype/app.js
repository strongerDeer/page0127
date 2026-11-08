/* All sentences and collection titles below are original prototype samples.
 * No excerpts from published books, translations, or book-cover assets are used.
 * Production content must be approved for display AND card export/sharing.
 */
const $ = (selector) => document.querySelector(selector);
const icons = {
  book: '<path d="M12 5C8 2 4 3 2 4v15c3-2 7-1 10 1 3-2 7-3 10-1V4c-2-1-6-2-10 1Z"/><path d="M12 5v15"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4V3Z"/>',
  share: '<path d="M12 15V2m-5 5 5-5 5 5M5 11H3v10h18V11h-2"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || ''}</svg>`; }
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));

const sentences = [
  { id: 'sample-01', text: '서두르지 않아도 괜찮다.\n오래 바라본 것들은\n결국 나의 방향이 된다.', bookId: 'sample-book-01', book: '천천히 읽는 마음', author: 'page0127. 창작 예시' },
  { id: 'sample-02', text: '오늘 다 읽지 못한 페이지는\n내일의 나를 기다리는\n작은 약속이 된다.', bookId: 'sample-book-01', book: '천천히 읽는 마음', author: 'page0127. 창작 예시' },
  { id: 'sample-03', text: '마음에 남은 문장 하나가\n하루의 무게를\n조금 다르게 놓아준다.', bookId: 'sample-book-01', book: '천천히 읽는 마음', author: 'page0127. 창작 예시' },
  { id: 'sample-04', text: '길을 고르는 동안에도\n나는 조금씩\n나에게 가까워지고 있었다.', bookId: 'sample-book-02', book: '작은 방향들', author: 'page0127. 창작 예시' },
  { id: 'sample-05', text: '낯선 길에서 주운 풍경이\n익숙한 하루를\n새롭게 읽게 한다.', bookId: 'sample-book-02', book: '작은 방향들', author: 'page0127. 창작 예시' },
  { id: 'sample-06', text: '모든 날에 답이 필요하지는 않다.\n어떤 날에는 좋은 질문 하나면\n충분하다.', bookId: 'sample-book-02', book: '작은 방향들', author: 'page0127. 창작 예시' },
  { id: 'sample-07', text: '말없이 건넨 자리 하나에도\n누군가를 생각하는 마음은\n충분히 앉을 수 있다.', bookId: 'sample-book-03', book: '다정함의 여백', author: 'page0127. 창작 예시' },
  { id: 'sample-08', text: '아무 일도 없던 오후에도\n빛은 한 번쯤\n내 쪽으로 기울었다.', bookId: 'sample-book-03', book: '다정함의 여백', author: 'page0127. 창작 예시' },
];
const storeKey = 'page0127.daily-sentence.prototype.v1';
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const today = dateKey(new Date());
const displayDate = (key) => new Date(`${key}T12:00:00`).toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'short' });
const source = (quote) => `《${quote.book}》 · ${quote.author}`;
let state = { draws: {}, records: [] };
let storageBroken = false;
try {
  const value = JSON.parse(localStorage.getItem(storeKey) || 'null');
  if (value && typeof value === 'object') {
    if (value.draws && typeof value.draws === 'object' && !Array.isArray(value.draws)) {
      state.draws = Object.fromEntries(Object.entries(value.draws).filter(([date,id]) => validDate(date) && sentences.some(q => q.id === id)));
    }
    if (Array.isArray(value.records)) {
      state.records = value.records.filter(r => r && validDate(r.date) && sentences.some(q => q.id === r.quoteId));
      state.records = state.records.filter((r,i,all) => all.findIndex(other => other.date === r.date) === i);
    }
  }
} catch { storageBroken = true; }
function validDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00`)) && dateKey(new Date(`${value}T12:00:00`)) === value; }
function persist(nextState) {
  try { localStorage.setItem(storeKey, JSON.stringify(nextState)); storageBroken = false; state = nextState; return true; }
  catch { storageBroken = true; toast('브라우저 저장을 사용할 수 없어요. 저장 공간과 설정을 확인해주세요.'); return false; }
}
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500); }
let currentQuote = sentences.find(q => q.id === state.draws[today]);
let opened = Boolean(currentQuote);
let opening = false;
let shareQuote = null;
let shareDate = today;
let imageBlob = null;
let imageURL = null;
let recordSelection = null;
let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
$('#today-date').textContent = displayDate(today);
$('#today-date').dateTime = today;

function view(name) {
  const archive = name === 'archive';
  $('#today-view').hidden = archive;
  $('#archive-view').hidden = !archive;
  document.querySelectorAll('.nav-button').forEach(button => {
    const active = button.dataset.view === name;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  if (archive) renderArchive();
  if (location.hash !== `#${name}`) history.replaceState(null, '', `#${name}`);
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => view(button.dataset.view)));
window.addEventListener('hashchange', () => view(location.hash === '#archive' ? 'archive' : 'today'));

function updateSaveButton() {
  const saved = currentQuote && state.records.some(r => r.date === today && r.quoteId === currentQuote.id);
  $('#save-label').textContent = saved ? '기록에 저장됨' : '기록에 저장';
  $('#save-quote').querySelector('[data-icon]').innerHTML = icon(saved ? 'check' : 'bookmark');
  $('#save-quote').setAttribute('aria-pressed', String(Boolean(saved)));
  $('#save-hint').textContent = saved ? '캘린더와 책별 기록에 남겼어요. 같은 문장으로 다시 만나요.' : '저장하면 캘린더와 책별 기록에 함께 남아요.';
  $('#nav-count').textContent = state.records.length;
}
function reveal(focus = false) {
  opening = false; opened = true;
  $('#book-stage').classList.remove('opening'); $('#book-stage').classList.add('revealed');
  $('#intro').hidden = true; $('#result').hidden = false;
  $('#today-view').setAttribute('aria-labelledby', 'result-heading');
  $('#quote-text').textContent = currentQuote.text;
  $('#quote-source').textContent = source(currentQuote);
  $('#paper-quote').textContent = currentQuote.text.replaceAll('\n', ' ');
  $('#paper-book').textContent = `《${currentQuote.book}》 · 창작 예시`;
  $('#stage-status').textContent = '오늘의 한 페이지가 펼쳐졌어요';
  updateSaveButton();
  if (focus) { $('#result').focus({ preventScroll:true }); $('#announcement').textContent = `오늘의 문장이 펼쳐졌어요. ${currentQuote.text}`; }
}
$('#open-book').addEventListener('click', () => {
  if (opening || opened) return;
  opening = true;
  const random = new Uint32Array(1); crypto.getRandomValues(random);
  currentQuote = sentences[random[0] % sentences.length];
  const nextState = { ...state, draws:{ ...state.draws, [today]:currentQuote.id } };
  if (!persist(nextState)) state = nextState; // Remains usable for this visit if persistence is unavailable.
  $('#open-book').disabled = true;
  $('#open-book').setAttribute('aria-busy', 'true');
  $('#opening-hint').textContent = '당신에게 닿을 한 문장을 찾고 있어요…';
  $('#stage-status').textContent = '책장을 넘기는 중…';
  $('#announcement').textContent = '책장을 넘기는 중입니다.';
  $('#book-stage').classList.add('opening');
  setTimeout(() => reveal(true), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 150 : 3100);
});
$('#save-quote').addEventListener('click', () => {
  if (!currentQuote) return;
  if (state.records.some(r => r.date === today)) { toast('이미 오늘의 문장을 간직했어요. 문장 기록에서 만나보세요.'); return; }
  const nextState = { ...state, records:[...state.records, { date:today, quoteId:currentQuote.id }] };
  if (persist(nextState)) { updateSaveButton(); renderArchive(); toast('오늘의 문장을 캘린더와 책별 기록에 저장했어요.'); }
});

function renderArchive() {
  $('#nav-count').textContent = state.records.length;
  $('#archive-count').textContent = `간직한 문장 ${state.records.length}개`;
  $('#archive-help').textContent = state.records.length ? '하루의 문장이 차곡차곡, 나만의 책장이 돼요.' : '첫 문장을 저장하면 이곳에 기록이 시작돼요.';
  renderCalendar(); renderBooks();
}
function renderCalendar() {
  const year = month.getFullYear(), m = month.getMonth();
  $('#month-title').textContent = `${year}년 ${m+1}월`;
  const grid = $('#calendar-grid'); grid.replaceChildren();
  const offset = new Date(year,m,1).getDay(), days = new Date(year,m+1,0).getDate();
  for (let i=0;i<Math.ceil((offset+days)/7)*7;i++) {
    const day = i-offset+1;
    if (day<1 || day>days) { const blank = document.createElement('div'); blank.className = 'calendar-day empty'; blank.setAttribute('aria-hidden','true'); grid.append(blank); continue; }
    const key = dateKey(new Date(year,m,day));
    const record = state.records.find(r => r.date === key);
    const quote = record && sentences.find(q => q.id === record.quoteId);
    const cell = document.createElement(record ? 'button' : 'div'); cell.className = `calendar-day${key === today ? ' today' : ''}${record ? ' has-record' : ''}`;
    const number = document.createElement('span'); number.className = 'day-number'; number.textContent = day; cell.append(number);
    if (key === today) cell.setAttribute('aria-current','date');
    if (record) {
      const title = document.createElement('span'); title.className = 'day-book'; title.textContent = quote.book;
      const preview = document.createElement('span'); preview.className = 'day-preview'; preview.textContent = quote.text.replaceAll('\n',' ');
      cell.append(title,preview); cell.setAttribute('aria-label',`${displayDate(key)} 간직한 문장: ${quote.book}`);
      cell.addEventListener('click',() => openRecord(record));
    } else cell.setAttribute('aria-label',`${displayDate(key)}, 기록 없음`);
    grid.append(cell);
  }
}
function renderBooks() {
  const panel = $('#books-panel'); panel.replaceChildren();
  if (!state.records.length) {
    const empty = document.createElement('div'); empty.className = 'empty-state';
    empty.innerHTML = `${icon('book')}<h2>아직 꽂아둔 문장이 없어요.</h2><p>오늘의 문장을 저장하면 책별로 모아드려요.</p><button class="button primary">첫 문장 만나러 가기</button>`;
    empty.querySelector('button').addEventListener('click',() => view('today')); panel.append(empty); return;
  }
  const groups = new Map();
  [...state.records].sort((a,b) => b.date.localeCompare(a.date)).forEach(record => {
    const quote = sentences.find(q => q.id === record.quoteId);
    if (!groups.has(quote.bookId)) groups.set(quote.bookId,[]);
    groups.get(quote.bookId).push({ record, quote });
  });
  for (const rows of groups.values()) {
    const { quote } = rows[0]; const group = document.createElement('article'); group.className = 'book-group';
    const cover = document.createElement('div'); cover.className = 'mini-cover'; cover.setAttribute('aria-hidden','true');
    const brand = document.createElement('small'); brand.textContent = 'page0127.';
    const title = document.createElement('strong'); title.textContent = quote.book;
    const sample = document.createElement('span'); sample.textContent = '가상 문장집 · 창작 예시'; cover.append(brand,title,sample);
    const content = document.createElement('div'); const heading = document.createElement('h2'); heading.textContent = `${quote.book} · ${rows.length}`; content.append(heading);
    rows.forEach(({record,quote}) => {
      const button = document.createElement('button'); button.className = 'record-row';
      const time = document.createElement('time'); time.dateTime = record.date; time.textContent = displayDate(record.date);
      const text = document.createElement('span'); text.textContent = quote.text.replaceAll('\n',' '); button.append(time,text);
      button.addEventListener('click',() => openRecord(record)); content.append(button);
    });
    group.append(cover,content); panel.append(group);
  }
}
function archiveTab(name) {
  const calendar = name === 'calendar';
  $('#calendar-panel').hidden = !calendar; $('#books-panel').hidden = calendar;
  $('#calendar-tab').classList.toggle('selected',calendar); $('#books-tab').classList.toggle('selected',!calendar);
  $('#calendar-tab').setAttribute('aria-pressed',String(calendar)); $('#books-tab').setAttribute('aria-pressed',String(!calendar));
}
$('#calendar-tab').addEventListener('click',() => archiveTab('calendar'));
$('#books-tab').addEventListener('click',() => archiveTab('books'));
$('#prev-month').addEventListener('click',() => { month = new Date(month.getFullYear(),month.getMonth()-1,1); renderCalendar(); });
$('#next-month').addEventListener('click',() => { month = new Date(month.getFullYear(),month.getMonth()+1,1); renderCalendar(); });
$('#current-month').addEventListener('click',() => { month = new Date(new Date().getFullYear(),new Date().getMonth(),1); renderCalendar(); });

function openRecord(record) {
  recordSelection = record;
  const quote = sentences.find(q => q.id === record.quoteId);
  $('#record-date').textContent = displayDate(record.date); $('#record-quote').textContent = quote.text; $('#record-source').textContent = source(quote);
  $('#record-dialog').showModal();
}
$('#record-delete').addEventListener('click',() => {
  if (!recordSelection) return;
  const nextState = { ...state, records:state.records.filter(r => r.date !== recordSelection.date) };
  if (persist(nextState)) { $('#record-dialog').close(); recordSelection = null; renderArchive(); updateSaveButton(); toast('기록에서 삭제했어요. 오늘의 문장은 다시 저장할 수 있어요.'); }
});

function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  text.split('\n').forEach(paragraph => {
    let line = '';
    for (const char of paragraph) {
      if (ctx.measureText(line+char).width > maxWidth && line) { lines.push(line); line = char; } else line += char;
    }
    if (line) lines.push(line);
  });
  return lines;
}
async function createCard(quote,date) {
  await document.fonts.ready;
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#14294e'; ctx.fillRect(0,0,1080,1920);
  ctx.strokeStyle = '#ffffff25'; ctx.lineWidth = 2; ctx.strokeRect(54,54,972,1812);
  ctx.fillStyle = '#6ee7b7'; ctx.fillRect(94,0,56,178); ctx.beginPath(); ctx.moveTo(94,178);ctx.lineTo(122,151);ctx.lineTo(150,178);ctx.fillStyle='#14294e';ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '700 39px -apple-system, "Apple SD Gothic Neo", sans-serif'; ctx.fillText('page0127.',88,259);
  ctx.font = '500 25px -apple-system, "Apple SD Gothic Neo", sans-serif'; ctx.fillStyle = '#c4d4eb'; ctx.fillText('오늘 나에게 펼쳐진 문장',88,345);
  ctx.fillStyle = '#6ee7b7'; ctx.font = '120px Georgia, serif'; ctx.fillText('“',81,605);
  let fontSize = 62, lines;
  do { ctx.font = `600 ${fontSize}px -apple-system, "Apple SD Gothic Neo", sans-serif`; lines = wrapLines(ctx,quote.text,890); if (lines.length*fontSize*1.8 <= 570) break; fontSize-=2; } while(fontSize>38);
  ctx.fillStyle = '#fff'; lines.forEach((line,i) => ctx.fillText(line,88,720+i*fontSize*1.8));
  const end = Math.max(1120,720+lines.length*fontSize*1.8+65);
  ctx.strokeStyle = '#ffffff40'; ctx.beginPath();ctx.moveTo(88,end);ctx.lineTo(150,end);ctx.stroke();
  ctx.fillStyle = '#e3eefc'; ctx.font = '500 30px -apple-system, "Apple SD Gothic Neo", sans-serif'; ctx.fillText(`《${quote.book}》`,88,end+72);
  ctx.font = '400 23px -apple-system, "Apple SD Gothic Neo", sans-serif';ctx.fillStyle = '#c4d4eb';ctx.fillText(quote.author,88,end+119);
  ctx.font = '400 22px -apple-system, "Apple SD Gothic Neo", sans-serif';ctx.fillText('프로토타입용 창작 문장 · 가상 문장집',88,1660);
  ctx.strokeStyle='#ffffff25';ctx.beginPath();ctx.moveTo(88,1730);ctx.lineTo(992,1730);ctx.stroke();
  ctx.fillStyle='#c4d4eb';ctx.font='400 24px -apple-system, "Apple SD Gothic Neo", sans-serif';ctx.fillText(date.replaceAll('-','.'),88,1794);ctx.fillText('책장이 나를 말해주는 곳.',670,1794);
  return new Promise((resolve,reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')),'image/png'));
}
async function openShare(quote,date) {
  shareQuote = quote; shareDate = date; imageBlob = null;
  $('#download-image').disabled = true; $('#native-share').disabled = true;
  $('#share-preview').removeAttribute('src'); $('#share-preview').hidden = true;
  $('#share-help').textContent = '이미지 카드를 준비하고 있어요…'; $('#copy-fallback').hidden = true;
  $('#share-dialog').showModal();
  try {
    imageBlob = await createCard(quote,date);
    if (imageURL) URL.revokeObjectURL(imageURL);
    imageURL = URL.createObjectURL(imageBlob); $('#share-preview').src = imageURL; $('#share-preview').hidden = false;
    $('#download-image').disabled = false; $('#native-share').disabled = false;
    $('#share-help').textContent = navigator.share ? '기기의 공유창에서 보낼 앱을 선택하세요.' : '이 브라우저는 바로 공유를 지원하지 않아요. 이미지를 저장해 올려주세요.';
  } catch { $('#share-help').textContent = '이미지를 만들지 못했어요. 아래에서 문장과 출처를 복사할 수 있어요.'; }
}
$('#share-quote').addEventListener('click',() => { if(currentQuote) openShare(currentQuote,today); });
$('#record-share').addEventListener('click',() => { const record = recordSelection; $('#record-dialog').close(); openShare(sentences.find(q => q.id === record.quoteId),record.date); });
function downloadImage() {
  if (!imageBlob || !imageURL) return;
  const a = document.createElement('a'); a.href = imageURL; a.download = `page0127-sentence-${shareDate}.png`; document.body.append(a); a.click(); a.remove();
  $('#share-help').textContent = '이미지 다운로드를 요청했어요. 사진이나 파일에 저장한 뒤 공유해보세요.';
}
$('#download-image').addEventListener('click',downloadImage);
const shareText = () => `오늘 나에게 펼쳐진 문장\n\n${shareQuote.text}\n\n${source(shareQuote)}\n프로토타입용 창작 문장 · 가상 문장집\n${shareDate} · page0127.`;
$('#native-share').addEventListener('click',async () => {
  if (!imageBlob) return;
  if (!navigator.share) { downloadImage(); return; }
  const file = new File([imageBlob],`page0127-sentence-${shareDate}.png`,{type:'image/png'});
  const data = navigator.canShare?.({files:[file]}) ? {files:[file],title:'오늘의 문장 · page0127.',text:shareText()} : {title:'오늘의 문장 · page0127.',text:shareText()};
  try { await navigator.share(data); $('#share-help').textContent = '공유창을 닫았어요. 문장은 언제든 다시 건넬 수 있어요.'; }
  catch(error) { if(error.name !== 'AbortError') $('#share-help').textContent = '공유창을 열지 못했어요. 이미지 저장이나 문장 복사를 이용해주세요.'; }
});
$('#copy-text').addEventListener('click',async () => {
  if (!shareQuote) return;
  try { await navigator.clipboard.writeText(shareText()); $('#share-help').textContent = '문장과 출처를 복사했어요.'; }
  catch { $('#copy-fallback').value=shareText();$('#copy-fallback').hidden=false;$('#copy-fallback').focus();$('#copy-fallback').select();$('#share-help').textContent='아래 선택된 문장을 직접 복사해주세요.'; }
});
document.querySelectorAll('.close-dialog').forEach(button => button.addEventListener('click',() => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click',event => { if(event.target === dialog) { const bounds=dialog.getBoundingClientRect(); if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close(); } }));
$('#about-content').addEventListener('click',() => $('#content-dialog').showModal());
window.addEventListener('storage',event => { if(event.key === storeKey) toast('다른 창에서 기록이 바뀌었어요. 새로고침하면 반영돼요.'); });
if (opened) reveal();
updateSaveButton(); renderArchive(); view(location.hash === '#archive' ? 'archive' : 'today');
if (storageBroken) toast('저장된 기록을 읽지 못했어요. 새 기록은 저장 설정을 확인해주세요.');
