const C='dksc-v118-phase10';const A=['./','./index.html','./core.js','./input_adapters.js','./exporters.js','./project_io.js','./manifest.webmanifest','./jszip.min.js','./pptxgen.min.js','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{const y=x.clone();caches.open(C).then(c=>c.put(e.request,y));return x}).catch(()=>caches.match('./index.html'))))});
