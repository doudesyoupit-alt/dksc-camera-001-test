const CACHE='vdraw-mobile-shell-006-v1';
const FILES=['./','index.html','style.css','manifest.webmanifest','assets/icon.svg','assets/icon-192.png','assets/icon-512.png','assets/icon-maskable.png','assets/NotoSansJP.ttf',...['app','core','commands','storage','render','device','vision','exporters','importers','icons','shell','native-runtime','perf','history-codec','trial-recorder','trial-event','native-io'].map(n=>'src/'+n+'.js'),...['jszip.min.js','pptxgen.bundle.js','pdf-lib.min.js','pdf.mjs','pdf.worker.mjs','native-bridge.js'].map(n=>'vendor/'+n)];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('message',e=>{if(e.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('vdraw-mobile-shell-006-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!e.request.url.startsWith(self.registration.scope))return;e.respondWith(caches.open(CACHE).then(async c=>await c.match(e.request)||fetch(e.request)));});
