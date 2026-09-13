/* ── save as image: lay the map out afresh at poster size, then rasterise ── */
const PAPER="#F2EFE7", INK="#1B1D1A", INK2="#6E7169", RULE="#DAD6CA";
const PLANNED="#E4A97D", PLANNED_INK="#C2814F";
const SANS="'Helvetica Neue',Helvetica,Arial,sans-serif";
const SERIF="'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif";

function mk(tag, attrs, text){
  const e = document.createElementNS(NS, tag);
  for(const k in attrs) e.setAttribute(k, attrs[k]);
  if(text != null) e.textContent = text;
  return e;
}
function poster(){
  const np = provinces.filter(p=>showsPlan(p.id)).length;
  const PAD = 84, MAP_H = 1240, HEAD = 172, FOOT = np ? 272 : 232;
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  provinces.forEach(p=>p.rings.forEach(r=>r.forEach(c=>{
    if(c[0]<x0)x0=c[0]; if(c[0]>x1)x1=c[0]; if(c[1]<y0)y0=c[1]; if(c[1]>y1)y1=c[1];
  })));
  const s = MAP_H/(y1-y0), mapW = (x1-x0)*s;
  const W = Math.round(mapW + PAD*2), H = Math.round(HEAD + MAP_H + FOOT);
  const tx = PAD - x0*s, ty = HEAD + y1*s;
  const mid = W/2;

  const svg = mk("svg",{xmlns:NS, width:W, height:H, viewBox:"0 0 "+W+" "+H});
  svg.appendChild(mk("rect",{x:0,y:0,width:W,height:H,fill:PAPER}));
  const title = logTitle() || "StampLogs";
  const tsize = Math.max(24, Math.min(44, Math.round(1400/Math.max(12, title.length))));
  svg.appendChild(mk("text",{x:mid,y:74,"text-anchor":"middle","font-family":SERIF,
    "font-size":tsize,"font-weight":600,fill:INK}, title));
  svg.appendChild(mk("text",{x:mid,y:106,"text-anchor":"middle","font-family":SANS,
    "font-size":13,"letter-spacing":2.4,fill:INK2},"PLAN AND STAMP YOUR MAP"));
  svg.appendChild(mk("line",{x1:PAD,y1:HEAD-36,x2:W-PAD,y2:HEAD-36,stroke:RULE,"stroke-width":1}));

  provinces.forEach(p=>{
    let d = "";
    p.rings.forEach(r=>{
      d += "M";
      r.forEach((c,i)=>{ d += (i?"L":"") + (c[0]*s + tx).toFixed(1) + " " + (ty - c[1]*s).toFixed(1); });
      d += "Z";
    });
    svg.appendChild(mk("path",{d:d,
      fill:visited[p.id] ? "#1B6B57" : showsPlan(p.id) ? PLANNED : "#E4E0D5",
      stroke:"#C7C2B4","stroke-width":0.8}));
  });

  const n = provinces.filter(p=>visited[p.id]).length, total = provinces.length || 82;
  const fy = HEAD + MAP_H + 74;
  svg.appendChild(mk("line",{x1:PAD,y1:fy-58,x2:W-PAD,y2:fy-58,stroke:RULE,"stroke-width":1}));
  svg.appendChild(mk("text",{x:mid,y:fy,"text-anchor":"middle","font-family":SERIF,
    "font-size":60,"font-weight":600,fill:INK}, n + " / " + total));
  svg.appendChild(mk("text",{x:mid,y:fy+34,"text-anchor":"middle","font-family":SANS,
    "font-size":13,"letter-spacing":2.4,fill:INK2},
    Math.round(n/total*100) + "% OF THE ARCHIPELAGO"));
  const parts = ISLANDS.map(g=>{
    const inG = provinces.filter(p=>p.island===g);
    return g.toUpperCase() + " " + inG.filter(p=>visited[p.id]).length + " / " + inG.length;
  });
  svg.appendChild(mk("text",{x:mid,y:fy+76,"text-anchor":"middle","font-family":SANS,
    "font-size":12.5,"letter-spacing":1.8,fill:INK2}, parts.join("  \u00B7  ")));
  if(np){
    svg.appendChild(mk("text",{x:mid,y:fy+114,"text-anchor":"middle","font-family":SANS,
      "font-size":12.5,"letter-spacing":1.8,fill:PLANNED_INK},
      (np === 1 ? "1 PROVINCE PLANNED" : np + " PROVINCES PLANNED")));
  }
  svg.appendChild(mk("text",{x:mid,y:fy+(np?156:118),"text-anchor":"middle","font-family":SANS,
    "font-size":11.5,"letter-spacing":1.6,fill:"#A9A79D"},
    new Date().toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"}).toUpperCase()));

  return {svg, W, H};
}
document.getElementById('png').onclick = ()=>{
  try{
    const {svg, W, H} = poster();
    const src = "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(new XMLSerializer().serializeToString(svg));
    const img = new Image();
    img.onload = ()=>{
      try{
        const k = 2, cv = document.createElement('canvas');
        cv.width = W*k; cv.height = H*k;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = PAPER; ctx.fillRect(0,0,cv.width,cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        cv.toBlob(b=>{
          if(!b){ toast("The image could not be created"); return; }
          download(b, fileName("png"));
          toast("Saved an image of your map");
        }, "image/png");
      }catch(e){ toast("The image could not be created"); }
    };
    img.onerror = ()=> toast("The image could not be created");
    img.src = src;
  }catch(e){ toast("The image could not be created"); }
};
