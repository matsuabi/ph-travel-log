/* ── Save file / Load file: the log as JSON, or a ZIP when there are photos ── */

/* A log with no photos stays a plain .json file; photos make it a .zip. */
document.getElementById('export').onclick = async ()=>{
  /* every stamped province, and every province merely carrying a date; a row with no
     stamp is marked as such so that loading it back does not stamp it */
  const rows = provinces.filter(p=> visited[p.id] || trips[String(p.id)]).map(p=>{
    const r = {id:p.id, name:p.name, region:p.region, island:p.island};
    if(visited[p.id]) r.date = visited[p.id]; else r.stamped = false;
    const t = trips[String(p.id)];
    if(t){ r.tripDate = t.date; r.tripKind = t.kind; }
    return r;
  });
  const stamped = provinces.filter(p=>visited[p.id]).length;
  const dated = rows.length - stamped;
  const tally = stamped + " provinces" + (dated ? " and " + dated + " dated" : "");
  const meta = {
    app:"stamplogs", version:1, appVersion:APP_VERSION, exported:new Date().toISOString(),
    nickname:nickname, count:stamped, total:provinces.length,
    photos:photoIds.size, provinces:rows
  };
  const text = JSON.stringify(meta, null, 2);
  if(!photoIds.size){
    download(new Blob([text], {type:"application/json"}), fileName("json"));
    toast("Saved "+tally+" to a file");
    return;
  }
  toast("Packing photos…");
  try{
    const recs = await photoAll();
    const files = [{name:"log.json", data:new TextEncoder().encode(text)}];
    for(const r of recs){
      if(!r || !r.full) continue;
      files.push({name:"images/"+r.id+".jpg", data:new Uint8Array(await r.full.arrayBuffer())});
    }
    download(zipWrite(files), fileName("zip"));
    toast("Saved "+tally+" and "+(files.length-1)+" photos");
  }catch(e){ toast("The file could not be written"); }
};
document.getElementById('import').onclick = ()=> document.getElementById('file').click();
function applyLog(j){
  const list = Array.isArray(j) ? j : j.provinces;
  if(!Array.isArray(list)) throw new Error("no province list");
  const known = new Set(provinces.map(p=>p.id));
  const next = {}, nextTrips = {}; let skipped = 0;
  list.forEach(p=>{
    const id = String(p.id || "");
    if(!known.has(id)){ skipped++; return; }
    if(p.stamped !== false) next[id] = p.date || UNDATED;  /* older files stamp every row */
    const t = cleanTrip({date:p.tripDate, kind:p.tripKind});
    /* older logs could hold either half alone: a stamped row loads as traveled, and
       a traveled row loads stamped — the day the stamp went on is not in the file. */
    if(t){
      nextTrips[id] = (next[id] && t.kind === "planned") ? {date:t.date, kind:"traveled"} : t;
      if(t.kind === "traveled" && !next[id]) next[id] = UNDATED;
    }
  });
  visited = next; save();
  trips = nextTrips; saveTrips();
  if(j && typeof j.nickname === "string"){ setNick(j.nickname); els.nick.value = nickname; }
  return {loaded:Object.keys(next).length, skipped};
}
/* A zip replaces the photos too; a plain .json leaves whatever is on the device alone. */
async function importPhotos(entries){
  const known = new Set(provinces.map(p=>p.id));
  try{ await photoClear(); }catch(e){}
  photoIds = new Set();
  let n = 0;
  for(const en of entries){
    const m = en.name.match(/([0-9]+)\.jpe?g$/i);
    if(!m || !known.has(m[1])) continue;
    try{
      await photoPut(await makePhoto(m[1], new Blob([en.data], {type:"image/jpeg"})));
      photoIds.add(m[1]); n++;
    }catch(e){}
  }
  if(n) await askPersist();
  paintPhotoMarks();
  return n;
}
document.getElementById('file').onchange = async e=>{
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if(!f) return;
  const isZip = /\.zip$/i.test(f.name) || f.type === "application/zip";
  try{
    let text, images = [];
    if(isZip){
      toast("Reading photos…");
      const entries = await zipRead(f);
      const lj = entries.find(x=> /(^|\/)log\.json$/i.test(x.name));
      if(!lj) throw new Error("no log.json");
      text = new TextDecoder().decode(lj.data);
      images = entries.filter(x=> /\.jpe?g$/i.test(x.name));
    } else {
      text = await f.text();
    }
    const r = applyLog(JSON.parse(text));
    let np = 0;
    if(isZip) np = await importPhotos(images);
    repaintAll();
    toast("Loaded "+r.loaded+" provinces" + (np ? " and "+np+" photos" : "") +
          (r.skipped ? " — "+r.skipped+" unrecognised" : ""));
  }catch(err){ toast("That file is not a StampLogs log"); }
};
