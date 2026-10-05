// Pure controller: injected plugin boundary, usable in fault tests without an OS.
export function nativeRuntime(plugins, handlers) {
 const handles = [], health = {};
 let disposed = false;
 const report = (feature, e) => {health[feature] = 'failed'; handlers.error?.(`${feature}：${e?.message || e}`);};
 const attempt = async (feature, fn) => {try {await fn(); health[feature] = 'ready';} catch(e) {report(feature, e);}};
 const run = async (feature, fn) => {try {await fn();} catch(e) {report(feature, e);}};
 const listen = async (feature, plugin, event, callback) => {
  await attempt(feature, async () => {const h = await plugin.addListener(event, data => {if(!disposed)void run(feature, () => callback(data));}); if(disposed)await h.remove();else handles.push(h);});
 };
 return {
  health,
  async start() {
   await listen('back', plugins.App, 'backButton', async () => {if(!await handlers.back())await plugins.App.minimizeApp();});
   await listen('lifecycle', plugins.App, 'appStateChange', async ({isActive}) => {
    const result = await (isActive ? handlers.resume() : handlers.suspend());
    if(!isActive && result === false)throw Error('休止前の保存が完了していません');
   });
   await listen('cameraRestore', plugins.App, 'appRestoredResult', async result => {
    if(result.pluginId !== 'Camera' || result.methodName !== 'getPhoto')return;
    if(!result.success)throw Error(result.error?.message || '撮影結果を復元できません。写真から選択できます');
    await handlers.restoredPhoto(result.data);
   });
   await attempt('statusBar', () => plugins.StatusBar.setStyle({style:plugins.Style.Light}));
   for(const event of ['keyboardDidShow', 'keyboardDidHide'])await listen(event, plugins.Keyboard, event, handlers.resize);
   // Always attempted even if every other plugin fails; never leave launch UI stuck.
   await attempt('splash', () => plugins.SplashScreen.hide());
   return {...health};
  },
  async dispose() {disposed = true;await Promise.all(handles.splice(0).map(h => run('cleanup', () => h.remove())));}
 };
}
