/* Boot. Every other file only declares things and wires up its own controls;
   this one runs last and starts the app, in order. Anything that schedules
   work for later (resize, observers, animation frames) is started here, so
   it can never fire before all the files above have loaded. */

document.getElementById('ver').textContent = "v" + APP_VERSION;
els.nick.value = nickname;
applyNick();
els.showplan.checked = showPlanned;
syncTools();

let rt; window.addEventListener('resize', ()=>{ clearTimeout(rt); rt = setTimeout(()=>{ syncTools(); relayout(); }, 150); });
if(window.ResizeObserver){
  new ResizeObserver(()=>{ clearTimeout(rt); rt = setTimeout(relayout, 60); }).observe(els.stage);
}
requestAnimationFrame(relayout);
window.addEventListener('load', relayout);

setListOpen(!narrow.matches);

prepare();
fit();
drawMap();
syncGroupToggle();
buildList();
paintStats();
migratePhotos().then(loadPhotoIndex, loadPhotoIndex);

syncSortSeg();
paintPhotoCount();
setView(mainView);
