const C='dksc-v118-phase10-validation-trace001-20261001';
const A=[
  './','./index.html','./core.js','./input_adapters.js','./exporters.js','./project_io.js',
  './manifest.webmanifest','./jszip.min.js','./pptxgen.min.js','./icon-192.png','./icon-512.png'
];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;

  // validation only: prefer the newest network version so every Git push is visible immediately.
  e.respondWith(
    fetch(e.request)
      .then(response=>{
        if(response && response.ok){
          const copy=response.clone();
          caches.open(C).then(cache=>cache.put(e.request,copy)).catch(()=>{});
        }
        return response;
      })
      .catch(async()=>{
        const cached=await caches.match(e.request);
        if(cached)return cached;
        if(e.request.mode==='navigate')return caches.match('./index.html');
        throw new Error('offline-and-not-cached');
      })
  );
});
