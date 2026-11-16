// Only public, full-resolution renders enter persistent storage. Customer
// drafts stay in their existing store; custom frames live in memory only.
export class NativeFrames {
  constructor(limit = 28_000_000) { this.limit=limit; this.bytes=0; this.entries=new Map(); this.design=null; }
  select(design) {
    if (design===this.design) return;
    this.design=design; this.entries.clear(); this.bytes=0;
  }
  get(key) {
    const hit=this.entries.get(key);
    if (hit) { this.entries.delete(key); this.entries.set(key,hit); }
    return hit?.image;
  }
  put(key,image) {
    const bytes=image.width*image.height*4;
    if (!bytes || bytes>this.limit) return;
    const old=this.entries.get(key);
    if (old) { this.bytes-=old.bytes; this.entries.delete(key); }
    this.entries.set(key,{image,bytes}); this.bytes+=bytes;
    while(this.bytes>this.limit) {
      const [first,entry]=this.entries.entries().next().value;
      this.entries.delete(first); this.bytes-=entry.bytes;
    }
  }
}

const DATABASE='ssk-public-render-cache-v1', MAX_BYTES=24_000_000, MAX_ENTRIES=24;
export class PublicRenders {
  constructor(revision, isolate='') {
    this.prefix=revision ? revision+'/'+isolate+'/' : null;
    this.blobs=new Map(); this.pending=new Map(); this.failed=false; this.hits=0;this.writes=0;
    this.ready=this.prefix ? this.open() : Promise.resolve();
  }
  async open() {
    // A blocked/denied store is optional, never a startup or ordering failure.
    try {
      const db=await new Promise((resolve,reject)=>{
        let abandoned=false;
        const request=indexedDB.open(DATABASE,1);
        request.onupgradeneeded=()=>request.result.createObjectStore('images',{keyPath:'key'});
        request.onsuccess=()=>{if(abandoned) request.result.close(); else resolve(request.result);};
        request.onerror=()=>reject(request.error);
        request.onblocked=()=>{abandoned=true;reject(new Error('Render cache blocked'));};
      });
      this.db=db; db.onversionchange=()=>db.close();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction('images','readonly'), request=tx.objectStore('images').getAll();
        request.onsuccess=()=>{ for(const row of request.result) if(typeof row?.key==='string' && row.key.startsWith(this.prefix)) this.blobs.set(row.key.slice(this.prefix.length),row); };
        tx.oncomplete=resolve; tx.onerror=tx.onabort=()=>reject(tx.error);
      });
    } catch { this.failed=true; }
  }
  async read(key,width,height) {
    if(!/^(starter:|default:)/.test(key) || !this.prefix) return null;
    // Do not hold an accepted first visit behind a slow local storage device.
    await Promise.race([this.ready,new Promise(resolve=>setTimeout(resolve,120))]);
    const row=this.blobs.get(key);
    if(!row) return null;
    if(row.width!==width || row.height!==height || !(row.blob instanceof Blob) || row.blob.type!=='image/png') {this.blobs.delete(key);return null;}
    if(this.pending.has(key)) return this.pending.get(key);
    const pending=new Promise(resolve=>{
      const url=URL.createObjectURL(row.blob), image=new Image();
      const finish=value=>{URL.revokeObjectURL(url);if(!value)this.blobs.delete(key);resolve(value);};
      image.onload=()=>{const valid=image.naturalWidth===width && image.naturalHeight===height;if(valid)this.hits++;finish(valid ? image : null);};
      image.onerror=()=>finish(null); image.src=url;
    });
    this.pending.set(key,pending);
    pending.finally(()=>this.pending.delete(key));
    return pending;
  }
  write(key,canvas) {
    if(this.failed || !this.prefix || !/^(starter:|default:)/.test(key) || this.blobs.has(key)) return;
    const width=canvas.width,height=canvas.height;
    if(!width || !height) return;
    try { canvas.toBlob(async blob=>{
      if(!blob || blob.type!=='image/png' || blob.size>MAX_BYTES) return;
      await this.ready;
      if(!this.db || this.failed) return;
      const row={key:this.prefix+key,blob,width,height,bytes:blob.size,used:Date.now()};
      try {
        const tx=this.db.transaction('images','readwrite'), store=tx.objectStore('images');
        // A single transaction makes eviction atomic across tabs. Only this
        // owned public-image store is touched, never a draft or gallery.
        store.put(row);
        const all=store.getAll();
        all.onsuccess=()=>{
          const rows=all.result.filter(r=>typeof r?.key==='string' && r.blob instanceof Blob)
            .sort((a,b)=>(Number.isFinite(a.used)?a.used:0)-(Number.isFinite(b.used)?b.used:0));
          let size=rows.reduce((n,r)=>n+r.blob.size,0), count=rows.length;
          for(const old of rows) {
            if(size<=MAX_BYTES && count<=MAX_ENTRIES) break;
            store.delete(old.key); size-=old.blob.size; count--;
          }
        };
        tx.oncomplete=()=>{this.blobs.set(key,row);this.writes++;};
        tx.onerror=tx.onabort=()=>{};
      } catch { /* Normal rendering is the fallback. */ }
    },'image/png'); } catch { /* Unavailable encoding must not break the preview. */ }
  }
}
