/* ── zip: store-only writer, stored + deflate reader ── */
const CRCT = (()=>{ const t = new Uint32Array(256);
  for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = (c & 1) ? (0xEDB88320 ^ (c>>>1)) : (c>>>1); t[n]=c>>>0; }
  return t; })();
function crc32(u8){
  let c = 0xFFFFFFFF;
  for(let i=0;i<u8.length;i++) c = CRCT[(c ^ u8[i]) & 0xFF] ^ (c>>>8);
  return (c ^ 0xFFFFFFFF)>>>0;
}
function zipWrite(files){
  const enc = new TextEncoder(), now = new Date();
  const time = ((now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1)) & 0xFFFF;
  const date = (((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate()) & 0xFFFF;
  const parts = [], central = []; let off = 0;
  files.forEach(f=>{
    const name = enc.encode(f.name), crc = crc32(f.data), n = f.data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true); lh.setUint16(4,20,true); lh.setUint16(6,0,true);
    lh.setUint16(8,0,true); lh.setUint16(10,time,true); lh.setUint16(12,date,true);
    lh.setUint32(14,crc,true); lh.setUint32(18,n,true); lh.setUint32(22,n,true);
    lh.setUint16(26,name.length,true); lh.setUint16(28,0,true);
    parts.push(new Uint8Array(lh.buffer), name, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true); ch.setUint16(4,20,true); ch.setUint16(6,20,true);
    ch.setUint16(8,0,true); ch.setUint16(10,0,true); ch.setUint16(12,time,true); ch.setUint16(14,date,true);
    ch.setUint32(16,crc,true); ch.setUint32(20,n,true); ch.setUint32(24,n,true);
    ch.setUint16(28,name.length,true); ch.setUint16(30,0,true); ch.setUint16(32,0,true);
    ch.setUint16(34,0,true); ch.setUint16(36,0,true); ch.setUint32(38,0,true);
    ch.setUint32(42,off,true);
    central.push(new Uint8Array(ch.buffer), name);
    off += 30 + name.length + n;
  });
  const cdSize = central.reduce((a,b)=> a + b.length, 0);
  const eo = new DataView(new ArrayBuffer(22));
  eo.setUint32(0,0x06054b50,true);
  eo.setUint16(8,files.length,true); eo.setUint16(10,files.length,true);
  eo.setUint32(12,cdSize,true); eo.setUint32(16,off,true);
  return new Blob(parts.concat(central, [new Uint8Array(eo.buffer)]), {type:"application/zip"});
}
async function zipRead(file){
  const buf = new Uint8Array(await file.arrayBuffer());
  const dv = new DataView(buf.buffer);
  let eo = -1;
  for(let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 65536; i--){
    if(dv.getUint32(i, true) === 0x06054b50){ eo = i; break; }
  }
  if(eo < 0) throw new Error("not a zip");
  const count = dv.getUint16(eo+10, true);
  let p = dv.getUint32(eo+16, true);
  const out = [], td = new TextDecoder();
  for(let i=0;i<count;i++){
    if(p + 46 > buf.length || dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p+10, true), csize = dv.getUint32(p+20, true);
    const nlen = dv.getUint16(p+28, true), elen = dv.getUint16(p+30, true), clen = dv.getUint16(p+32, true);
    const lho = dv.getUint32(p+42, true);
    const name = td.decode(buf.subarray(p+46, p+46+nlen));
    const start = lho + 30 + dv.getUint16(lho+26, true) + dv.getUint16(lho+28, true);
    let data = buf.subarray(start, start + csize);
    if(method === 8){
      data = new Uint8Array(await new Response(
        new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))
      ).arrayBuffer());
    } else if(method !== 0){ p += 46 + nlen + elen + clen; continue; }
    out.push({name, data});
    p += 46 + nlen + elen + clen;
  }
  return out;
}
