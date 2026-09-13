/* ── photos view: the same log read as a contact sheet ── */
const photosEl = document.getElementById('photos');
const viewSeg = document.getElementById('viewseg');
const sortSeg = document.getElementById('photosort');
const photoSheetEl = document.getElementById('photosheet');
let sheetURLs = [], pst = null;

function setView(v){
  mainView = v === "photos" ? "photos" : "map";
  try{ localStorage.setItem(VIEW_KEY, mainView); }catch(e){}
  document.body.dataset.view = mainView;
  viewSeg.querySelectorAll('button').forEach(b=>{
    b.setAttribute('aria-pressed', String(b.dataset.view === mainView));
  });
  if(mainView === "photos") buildPhotoSheet(); else relayout();
}
function syncSortSeg(){
  sortSeg.querySelectorAll('button').forEach(b=>{
    b.setAttribute('aria-pressed', String(b.dataset.sort === photoSort));
  });
}
viewSeg.onclick = e=>{
  const b = e.target.closest('button[data-view]');
  if(b) setView(b.dataset.view);
};
sortSeg.onclick = e=>{
  const b = e.target.closest('button[data-sort]');
  if(!b || b.dataset.sort === photoSort) return;
  photoSort = b.dataset.sort;
  try{ localStorage.setItem(PSORT_KEY, photoSort); }catch(err){}
  syncSortSeg();
  buildPhotoSheet();
  photosEl.scrollTop = 0;
};
function dropSheetURLs(){ sheetURLs.forEach(u=> URL.revokeObjectURL(u)); sheetURLs = []; }
function paintPhotoCount(){ document.getElementById('viewcount').textContent = String(photoIds.size); }
function schedulePhotoSheet(){
  paintPhotoCount();
  if(mainView !== "photos") return;
  clearTimeout(pst); pst = setTimeout(buildPhotoSheet, 30);
}
/* Thumbnails come out of the same store the panel reads, so the sheet is never a
   second copy of anything — and only a province holding a photo is on it. */
async function buildPhotoSheet(){
  const order = [];
  let recs = [];
  try{ recs = await photoAll(); }catch(e){}
  const byId = {};
  recs.forEach(r=>{ if(r && (r.thumb || r.full)) byId[String(r.id)] = r; });
  const have = provinces.filter(p=> byId[p.id]);
  dropSheetURLs();
  photoSheetEl.textContent = "";
  if(!have.length){
    sheetOrder = order;
    if(viewerIsOpen()) closeViewer();
    const d = document.createElement('div');
    d.className = "pempty";
    const h = document.createElement('b'); h.textContent = "No photos yet";
    d.append(h, "Stamp a province on the map, then add a photo from its panel. One photo each, kept on this device.");
    photoSheetEl.appendChild(d);
    return;
  }
  const groups = [];
  if(photoSort === "alpha"){
    have.slice().sort((a,b)=> a.name.localeCompare(b.name)).forEach(p=>{
      const L = p.name.charAt(0).toUpperCase();
      let g = groups[groups.length-1];
      if(!g || g.name !== L){ g = {name:L, rows:[], sub:""}; groups.push(g); }
      g.rows.push(p);
    });
    groups.forEach(g=>{ g.sub = g.rows.length + (g.rows.length === 1 ? " province" : " provinces"); });
  } else {
    const key = photoSort === "region" ? (p=>p.region) : (p=>p.island);
    (photoSort === "region" ? regionNames() : ISLANDS.slice()).forEach(name=>{
      const rows = have.filter(p=> key(p) === name);
      if(!rows.length) return;
      groups.push({name:name, rows:rows, sub:rows.length + " of " + provinces.filter(p=> key(p) === name).length});
    });
  }
  groups.forEach(g=>{
    const h = document.createElement('div');
    h.className = "pgrp";
    const nm = document.createElement('b'); nm.textContent = g.name;
    const ct = document.createElement('span'); ct.className = "mono"; ct.textContent = g.sub;
    h.append(nm, ct);
    photoSheetEl.appendChild(h);
    const grid = document.createElement('div');
    grid.className = "psheet";
    g.rows.forEach(p=>{
      const rec = byId[p.id];
      const b = document.createElement('button');
      b.className = "ptile"; b.type = "button";
      const th = document.createElement('span'); th.className = "th";
      const nm2 = document.createElement('span'); nm2.className = "nm"; nm2.textContent = p.name;
      const u = URL.createObjectURL(rec.thumb || rec.full);
      sheetURLs.push(u);
      const img = document.createElement('img');
      img.src = u; img.loading = "lazy";
      img.alt = "Your photo for " + p.name;
      th.appendChild(img);
      b.append(th, nm2);
      /* a tile opens the photo on its own — the sheet's order is kept so the
         whole log can be read one frame at a time from wherever you started */
      const at = order.length;
      order.push(p);
      b.onclick = ()=> openViewer(at);
      grid.appendChild(b);
    });
    photoSheetEl.appendChild(grid);
  });
  sheetOrder = order;
  if(viewerIsOpen()) syncViewerIndex();
}

/* ── the photo on its own: fitted to the width, swiped through the sheet ── */
const viewerEl = document.getElementById('viewer');
const viewerImg = document.getElementById('viewer-img');
const viewerStage = document.getElementById('viewer-stage');
let sheetOrder = [], viewerAt = -1, viewerURL = null;

function viewerIsOpen(){ return !viewerEl.hidden; }
function dropViewerURL(){ if(viewerURL){ URL.revokeObjectURL(viewerURL); viewerURL = null; } }
function fmtDay(iso){
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? iso : d.toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});
}
/* the province's own date, and whether that day is stamped or still planned */
function viewerDateLine(p){
  const t = trips[String(p.id)];
  if(t) return (t.kind === "planned" ? "Planned for " : "Stamped ") + fmtDay(t.date);
  const v = visited[p.id];
  return v && v !== UNDATED ? "Stamped " + fmtDay(v) : v ? "Stamped" : "Not dated";
}
function paintViewerDots(){
  const dots = document.getElementById('viewer-dots');
  dots.textContent = "";
  if(sheetOrder.length < 2 || sheetOrder.length > 24) return;
  sheetOrder.forEach((p,i)=>{
    const d = document.createElement('i');
    if(i === viewerAt) d.className = "on";
    dots.appendChild(d);
  });
}
async function paintViewer(){
  const p = sheetOrder[viewerAt];
  if(!p){ closeViewer(); return; }
  document.getElementById('viewer-n').textContent = (viewerAt+1) + " / " + sheetOrder.length;
  document.getElementById('viewer-name').textContent = p.name;
  document.getElementById('viewer-rg').textContent = p.region;
  document.getElementById('viewer-date').textContent = viewerDateLine(p);
  paintViewerDots();
  let rec = null;
  try{ rec = await photoGet(p.id); }catch(e){}
  if(!viewerIsOpen() || sheetOrder[viewerAt] !== p) return;
  dropViewerURL();
  if(rec && (rec.full || rec.thumb)){
    viewerURL = URL.createObjectURL(rec.full || rec.thumb);
    viewerImg.src = viewerURL;
    viewerImg.alt = "Your photo for " + p.name;
    viewerImg.style.opacity = 1;
  } else {
    viewerImg.removeAttribute('src');
  }
}
function openViewer(i){
  if(i < 0 || i >= sheetOrder.length) return;
  viewerAt = i;
  viewerEl.hidden = false;
  paintViewer();
  document.getElementById('viewer-close').focus({preventScroll:true});
}
function closeViewer(){
  viewerEl.hidden = true;
  viewerAt = -1;
  dropViewerURL();
  viewerImg.removeAttribute('src');
}
/* the sheet can be rebuilt underneath — hold the province, not the index */
function syncViewerIndex(){
  const p = viewerAt >= 0 ? sheetOrder[viewerAt] : null;
  if(!sheetOrder.length){ closeViewer(); return; }
  if(!p) viewerAt = Math.min(Math.max(viewerAt,0), sheetOrder.length-1);
  paintViewer();
}
function stepViewer(d){
  if(sheetOrder.length < 2) return;
  viewerAt = (viewerAt + d + sheetOrder.length) % sheetOrder.length;
  viewerImg.style.opacity = .25;
  paintViewer();
}
document.getElementById('viewer-close').onclick = closeViewer;
viewerEl.addEventListener('keydown', e=>{
  if(e.key === "ArrowRight") stepViewer(1);
  else if(e.key === "ArrowLeft") stepViewer(-1);
});
let vsx = 0, vsy = 0, vswipe = false;
viewerStage.addEventListener('pointerdown', e=>{
  vsx = e.clientX; vsy = e.clientY; vswipe = true;
});
viewerStage.addEventListener('pointerup', e=>{
  if(!vswipe) return;
  vswipe = false;
  const dx = e.clientX - vsx, dy = e.clientY - vsy;
  if(Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) stepViewer(dx < 0 ? 1 : -1);
});
viewerStage.addEventListener('pointercancel', ()=>{ vswipe = false; });
document.getElementById('viewer-remove').onclick = async ()=>{
  const p = sheetOrder[viewerAt];
  if(!p) return;
  try{
    await photoDel(p.id);
    photoIds.delete(String(p.id));
    if(hot === p){ hot = null; setHot(p); }
    if(sheetProv === p) await paintSheetPhoto();
    /* the sheet rebuilds without this province; stay on the frame that takes
       its place, or close if that was the last photo */
    sheetOrder = sheetOrder.filter(x=> x !== p);
    if(!sheetOrder.length) closeViewer();
    else { viewerAt = Math.min(viewerAt, sheetOrder.length-1); paintViewer(); }
    paintPhotoMarks();
    toast("Photo removed from " + p.name);
  }catch(e){ toast("The photo could not be removed"); }
};
