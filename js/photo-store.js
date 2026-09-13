/* ── photos: one per province, held in IndexedDB on this device only ── */
const MAX_FULL = 1600, MAX_THUMB = 320;
let photoIds = new Set();
let dbp = null;

function pdb(){
  if(!dbp) dbp = new Promise((ok,no)=>{
    const rq = indexedDB.open(PHOTO_DB, 1);
    rq.onupgradeneeded = ()=> rq.result.createObjectStore(PHOTO_STORE, {keyPath:"id"});
    rq.onsuccess = ()=> ok(rq.result);
    rq.onerror = ()=> no(rq.error);
  });
  return dbp;
}
function ptx(mode, fn){
  return pdb().then(d=> new Promise((ok,no)=>{
    const t = d.transaction(PHOTO_STORE, mode), rq = fn(t.objectStore(PHOTO_STORE));
    t.oncomplete = ()=> ok(rq ? rq.result : undefined);
    t.onerror = ()=> no(t.error);
    t.onabort = ()=> no(t.error);
  }));
}
const photoGet   = id  => ptx("readonly",  st=> st.get(id));
const photoPut   = rec => ptx("readwrite", st=> st.put(rec));
const photoDel   = id  => ptx("readwrite", st=> st.delete(id));
const photoKeys  = ()  => ptx("readonly",  st=> st.getAllKeys());
const photoAll   = ()  => ptx("readonly",  st=> st.getAll());
const photoClear = ()  => ptx("readwrite", st=> st.clear());

/* Photos sat in a database called ph82-photos under the old name. Copy them over
   once, only into an empty store, and leave the old database untouched. */
function readOldPhotos(){
  return new Promise(function(ok, no){
    const rq = indexedDB.open(OLD_PHOTO_DB, 1);
    let fresh = false;
    rq.onupgradeneeded = ()=>{ fresh = true; };   /* it did not exist — nothing to carry */
    rq.onsuccess = ()=>{
      const d = rq.result;
      if(fresh || !d.objectStoreNames.contains(PHOTO_STORE)){ d.close(); ok([]); return; }
      try{
        const t = d.transaction(PHOTO_STORE, "readonly"), g = t.objectStore(PHOTO_STORE).getAll();
        t.oncomplete = ()=>{ d.close(); ok(g.result || []); };
        t.onerror = ()=>{ d.close(); ok([]); };
      }catch(e){ d.close(); ok([]); }
    };
    rq.onerror = ()=> ok([]);
    rq.onblocked = ()=> ok([]);
  });
}
async function migratePhotos(){
  try{
    if(localStorage.getItem(PHOTO_MIGRATED_KEY)) return;
    if(indexedDB.databases){
      const names = (await indexedDB.databases()).map(d=> d && d.name);
      if(names.indexOf(OLD_PHOTO_DB) < 0){ localStorage.setItem(PHOTO_MIGRATED_KEY,"1"); return; }
    }
    const recs = await readOldPhotos();
    if(recs.length && !(await photoKeys()).length){
      for(const r of recs){ try{ await photoPut(r); }catch(e){} }
    }
    localStorage.setItem(PHOTO_MIGRATED_KEY, "1");
  }catch(e){}
}

async function loadPhotoIndex(){
  try{ photoIds = new Set((await photoKeys()).map(String)); }catch(e){ photoIds = new Set(); }
  paintPhotoMarks();
}
function paintPhotoMarks(){
  els.list.querySelectorAll('.row').forEach(r=>{
    r.dataset.photo = photoIds.has(r.dataset.id) ? "1" : "0";
  });
  schedulePhotoSheet();
}
async function askPersist(){
  try{
    if(navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted()))
      await navigator.storage.persist();
  }catch(e){}
}

/* Re-encoding through a canvas both shrinks the file and drops EXIF, so location
   and camera data never ride along into an exported zip. */
async function bitmapOf(file){
  try{ return await createImageBitmap(file, {imageOrientation:"from-image"}); }catch(e){}
  try{ return await createImageBitmap(file); }catch(e){}
  return await new Promise((ok,no)=>{
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = ()=>{ URL.revokeObjectURL(u); ok(img); };
    img.onerror = ()=>{ URL.revokeObjectURL(u); no(new Error("decode")); };
    img.src = u;
  });
}
function scaleTo(src, max, q){
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
  if(!w || !h) return Promise.reject(new Error("empty"));
  const k = Math.min(1, max/Math.max(w,h));
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w*k)); cv.height = Math.max(1, Math.round(h*k));
  cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
  return new Promise((ok,no)=> cv.toBlob(b=> b ? ok({blob:b, w:cv.width, h:cv.height}) : no(new Error("encode")), "image/jpeg", q));
}
async function makePhoto(id, file){
  const src = await bitmapOf(file);
  try{
    const full = await scaleTo(src, MAX_FULL, .85);
    const thumb = await scaleTo(src, MAX_THUMB, .8);
    return {id:String(id), full:full.blob, thumb:thumb.blob, w:full.w, h:full.h,
            added:new Date().toISOString().slice(0,10)};
  } finally { if(src.close) src.close(); }
}
