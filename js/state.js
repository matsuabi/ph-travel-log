/* The log itself — stamps, trip dates, the nickname and view preferences —
   read from localStorage on load and written back as it changes. */

/* The keys were named ph82.* while the app was called Eighty-Two. Carry a log
   written under the old names across once, and leave the originals where they
   are — an older copy of the page still opens them, and nothing is thrown away. */
const MIGRATED_KEY = "stamplogs.migrated.v1";
const OLD_KEYS = [
  ["ph82.visited.v1", SAVE_KEY], ["ph82.nickname.v1", NICK_KEY],
  ["ph82.trips.v1", TRIP_KEY], ["ph82.groupby.v1", GROUP_KEY],
  ["ph82.showplanned.v1", PLAN_KEY]
];
function migrateKeys(){
  try{
    if(localStorage.getItem(MIGRATED_KEY)) return;
    OLD_KEYS.forEach(function(kv){
      const was = localStorage.getItem(kv[0]);
      if(was !== null && localStorage.getItem(kv[1]) === null) localStorage.setItem(kv[1], was);
    });
    localStorage.setItem(MIGRATED_KEY, "1");
  }catch(e){}
}
migrateKeys();

let visited = loadSave();
let trips = loadTrips();
let groupBy = loadGroupBy();
let showPlanned = loadShowPlanned();
let nickname = loadNick();
let mainView = loadView();
let photoSort = loadPhotoSort();

function loadSave(){ try{ return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; }catch(e){ return {}; } }
function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(visited)); }catch(e){} }
function stampLabel(v){ return v && v !== UNDATED ? "stamped " + v : "stamped"; }

/* A trip is the province's own date — when it was traveled, or when it is planned
   for — kept apart from the stamp date, which is simply when the stamp went on. */
function loadTrips(){
  try{
    const raw = JSON.parse(localStorage.getItem(TRIP_KEY)) || {};
    const out = {};
    for(const id in raw){
      const t = cleanTrip(raw[id]);
      if(t) out[String(id)] = t;
    }
    return out;
  }catch(e){ return {}; }
}
function saveTrips(){ try{ localStorage.setItem(TRIP_KEY, JSON.stringify(trips)); }catch(e){} }
function cleanTrip(t){
  if(!t || typeof t !== "object") return null;
  const date = String(t.date || "");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return {date:date, kind:KINDS.indexOf(t.kind) < 0 ? "traveled" : t.kind};
}
function setTrip(id, date, kind){
  const t = cleanTrip({date:date, kind:kind});
  if(t) trips[String(id)] = t; else delete trips[String(id)];
  saveTrips();
  return t;
}
function tripLabel(t){ return t ? (t.kind === "planned" ? "planned for " : "stamped ") + t.date : ""; }
/* A province is shown as planned while the trip is still ahead of the stamp —
   once it is stamped the stamp is the truer thing to say, so green wins. */
function isPlanned(id){
  const t = trips[String(id)];
  return !!t && t.kind === "planned" && !visited[id];
}
/* The sidebar switch decides only whether a plan is drawn — on the map, in the
   list and on the saved image. The date itself is left alone either way. */
function showsPlan(id){ return showPlanned && isPlanned(id); }
function loadNick(){
  try{ return (localStorage.getItem(NICK_KEY) || "").slice(0,24); }catch(e){ return ""; }
}
function setNick(v){
  nickname = String(v || "").replace(/\s+/g," ").trim().slice(0,24);
  try{ nickname ? localStorage.setItem(NICK_KEY, nickname) : localStorage.removeItem(NICK_KEY); }catch(e){}
  applyNick();
}
/* the nickname titles the log: "Abi's" becomes "Abi's StampLogs" */
function logTitle(){ return nickname ? nickname + " StampLogs" : ""; }
function loadGroupBy(){
  try{ return localStorage.getItem(GROUP_KEY) === "region" ? "region" : "island"; }catch(e){ return "island"; }
}
function loadShowPlanned(){
  try{ return localStorage.getItem(PLAN_KEY) !== "0"; }catch(e){ return true; }
}
function setShowPlanned(on){
  showPlanned = !!on;
  try{ localStorage.setItem(PLAN_KEY, showPlanned ? "1" : "0"); }catch(e){}
}

function loadView(){
  try{ return localStorage.getItem(VIEW_KEY) === "photos" ? "photos" : "map"; }catch(e){ return "map"; }
}
function loadPhotoSort(){
  try{
    const s = localStorage.getItem(PSORT_KEY);
    return s === "region" || s === "alpha" ? s : "island";
  }catch(e){ return "island"; }
}

/* one of three, read off the log itself: a stamp, a plan, or neither */
function statusOf(p = sheetProv){
  if(!p) return "none";
  if(visited[p.id]) return "traveled";
  return trips[String(p.id)] ? "planned" : "none";
}
