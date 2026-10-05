// Actual adapters: web/src/shell.js, native-runtime.js, device.js, storage.js.
// These interfaces describe boundaries. Native OS confirmation is still pending.
export type SaveState = 'unsaved'|'saved'|'failed';
export interface CameraPort { capture():Promise<File|null>; }
export interface FilePort { pick(types:string[]):Promise<File|null>; } // HTML OS file input, native verification pending
export interface SharePort { share(blob:Blob,name:string,share:boolean):Promise<'downloaded'|'shared'|'share-requested'>; }
export interface PersistencePort { save(document:unknown,history?:unknown):Promise<number>; loadSession(id:string):Promise<unknown>; }
export interface ShellPort { start():Promise<Record<string,string>>; dispose():Promise<void>; }
// Vision CLI is private/offline by default. HTTP job service and secure OS credentials are future work.
export interface VisionCandidatePort { receive(document:unknown,result:unknown):unknown; }
