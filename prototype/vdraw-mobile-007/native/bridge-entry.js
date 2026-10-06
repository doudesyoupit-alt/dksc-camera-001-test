import {Capacitor,registerPlugin} from '@capacitor/core';
import {App} from '@capacitor/app';import {Camera,CameraResultType,CameraSource} from '@capacitor/camera';
import {Filesystem,Directory} from '@capacitor/filesystem';import {Share} from '@capacitor/share';
import {StatusBar,Style} from '@capacitor/status-bar';import {Keyboard} from '@capacitor/keyboard';import {SplashScreen} from '@capacitor/splash-screen';
const DocumentSave=registerPlugin('DocumentSave');
export {DocumentSave,Capacitor,App,Camera,CameraResultType,CameraSource,Filesystem,Directory,Share,StatusBar,Style,Keyboard,SplashScreen};

