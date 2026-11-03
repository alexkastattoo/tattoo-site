<?php
// Media prototype: no accounts, no database. Saved links live only in this browser.
?><!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Моя медиатека</title>
<style>
:root{color-scheme:dark;font-family:system-ui,-apple-system,sans-serif}body{margin:0;background:#10131b;color:#f3f5fa}main{max-width:850px;margin:auto;padding:24px 16px}h1{margin:0 0 8px}p{color:#aab4c7}section{background:#1b2030;border:1px solid #30374b;border-radius:16px;padding:16px;margin:16px 0}input,select,button{font:inherit;border-radius:10px;padding:12px;border:1px solid #46506a;background:#111625;color:white}input{width:100%;box-sizing:border-box;margin:5px 0 10px}button{cursor:pointer}button.primary{background:#526af0;border:0}button:disabled{opacity:.5}#tabs{display:flex;gap:8px;flex-wrap:wrap}#tabs button.active{background:#526af0}.item{display:flex;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid #30374b}.item small{display:block;color:#aab4c7;margin-top:5px;overflow-wrap:anywhere}.item button{white-space:nowrap}.player{aspect-ratio:16/9;background:#090b11;border-radius:12px;overflow:hidden}.player iframe{width:100%;height:100%;border:0}.muted{font-size:13px}a{color:#9cb0ff}#status{min-height:20px}
</style></head><body><main>
<h1>Моя медиатека</h1><p>Сохраняй ссылки и собирай собственные подборки.</p>
<section><h2>Добавить материал</h2>
<label>Ссылка<input id="url" type="url" placeholder="https://www.youtube.com/watch?v=..." autocomplete="off"></label>
<label>Название<input id="name" placeholder="Например, Урок по фотографии"></label>
<label>Категория<select id="category"><option>Образование</option><option>Музыка</option><option>Искусство</option><option>Другое</option></select></label>
<button class="primary" id="add">Сохранить</button><p id="status" aria-live="polite"></p></section>
<section><h2>Мои категории</h2><div id="tabs"></div><p class="muted">«Все» показывает материалы из всех категорий.</p>
<button class="primary" id="playAll">▶ Воспроизвести выбранную категорию</button></section>
<section><h2>Плеер</h2><div class="player" id="player"></div><p id="now"></p>
<button id="next">Следующий</button><p class="muted">YouTube открывается во встроенном официальном плеере. Автоматическое переключение между роликами не гарантируется. Другие сайты открываются по ссылке.</p></section>
<section><h2>Сохранённое</h2><div id="items"></div></section>
<p class="muted">Тестовая версия: данные хранятся только в браузере на этом устройстве. Очистка данных браузера удалит список. Без входа и синхронизации.</p>
</main><script>
const KEY='media_proto_v1';
let items=[];try{const parsed=JSON.parse(localStorage.getItem(KEY)||'[]');items=Array.isArray(parsed)?parsed:[]}catch{}
let active='Все',queue=[],position=-1;
const $=id=>document.getElementById(id);
const categories=['Все','Образование','Музыка','Искусство','Другое'];
const save=()=>localStorage.setItem(KEY,JSON.stringify(items));
function youtubeId(raw){try{const u=new URL(raw);const host=u.hostname.toLowerCase().replace(/^www\./,'');let id=null;if(host==='youtu.be')id=u.pathname.split('/')[1];if(['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com'].includes(host)){if(u.pathname==='/watch')id=u.searchParams.get('v');else if(/^\/(shorts|embed|live)\//.test(u.pathname))id=u.pathname.split('/')[2]}return /^[\w-]{11}$/.test(id||'')?id:null}catch{return null}}
function render(){
$('tabs').replaceChildren();
categories.forEach(c=>{const b=document.createElement('button');b.textContent=c;b.className=c===active?'active':'';b.onclick=()=>{active=c;render()};$('tabs').append(b)});
$('items').replaceChildren();const visible=items.filter(x=>active==='Все'||x.category===active);
if(!visible.length){const p=document.createElement('p');p.textContent='Пока ничего не сохранено.';$('items').append(p)}
visible.forEach(x=>{const row=document.createElement('div');row.className='item';const info=document.createElement('div');const title=document.createElement('strong');title.textContent=x.name;const meta=document.createElement('small');meta.textContent=x.category+' · '+x.url;info.append(title,meta);const actions=document.createElement('div');const play=document.createElement('button');play.textContent='▶';play.title='Открыть';play.onclick=()=>{queue=visible;position=queue.findIndex(v=>v.id===x.id);playCurrent()};const del=document.createElement('button');del.textContent='×';del.title='Удалить';del.onclick=()=>{if(confirm('Удалить материал?')){items=items.filter(v=>v.id!==x.id);save();render()}};actions.append(play,del);row.append(info,actions);$('items').append(row)});
}
function playCurrent(){const x=queue[position];if(!x)return;$('player').replaceChildren();$('now').textContent=x.name;const id=youtubeId(x.url);
if(id){const iframe=document.createElement('iframe');iframe.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?autoplay=1';iframe.title=x.name;iframe.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.allowFullscreen=true;$('player').append(iframe)}
else{const a=document.createElement('a');a.href=x.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Открыть материал на исходном сайте';$('player').append(a)}
}
$('add').onclick=()=>{const raw=$('url').value.trim(),name=$('name').value.trim();let u;try{u=new URL(raw);if(!['http:','https:'].includes(u.protocol))throw Error()}catch{$('status').textContent='Введите корректную ссылку http или https.';return}
if(!name){$('status').textContent='Добавьте название.';return}
items.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random(),url:u.href,name,category:$('category').value});save();$('url').value='';$('name').value='';$('status').textContent='Сохранено в этом браузере.';render()};
$('playAll').onclick=()=>{queue=items.filter(x=>active==='Все'||x.category===active);position=0;playCurrent()};
$('next').onclick=()=>{if(position+1<queue.length){position++;playCurrent()}else $('now').textContent='Конец списка.'};
render();
</script></body></html>