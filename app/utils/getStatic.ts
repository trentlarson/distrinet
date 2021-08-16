// originally from https://github.com/loopmode/electron-webpack-static-examples/blob/master/src/renderer/utils/getStatic.ts
import electron from 'electron';
import path from 'path';

// Supposedly the 'remote' package is deprecated https://www.electronjs.org/docs/api/remote
// ... to disappear in v14 https://github.com/electron/electron/issues/21408
// ... but I cannot figure out how to get a handle on 'app' any other way.
const IS_PACKAGED = electron.remote.app.isPackaged;
console.log('getStatic IS_PACKAGED', IS_PACKAGED);

// The resources path, the location of app.asar
const APP_PATH = electron.remote.app.getAppPath();
console.log('getStatic APP_PATH', APP_PATH);

// Doing this just to eliminate more unknowns.
const STATIC_PARENT = path.parse(APP_PATH).dir;
console.log('getStatic STATIC_PARENT', STATIC_PARENT);

export default function getStatic(relativePath = '') {
  // Alternative: a path under the top level of the source (when running 'yarn dev')
  // ... but when packaged it always has a value of '/'
  // I think __dirname is from https://nodejs.org/api/modules.html#modules_dirname
  // return path.resolve(__dirname, 'app/static', relativePath);

  // Alternative: the solution from https://webpack.electron.build/using-static-assets
  // (However, let's not return a URL on dev and a file path on prod. Ug.)
  // window.location.origin ends up being 'file://' and 'url.resolve' ensures '/' before relative path if none exists
  // return url.resolve(window.location.origin, relativePath); // requires this at top: import * as url from 'url';

  // Final Alternative: use app.isPackaged
  if (IS_PACKAGED) {
    // This is in a 'Resources' directory (found in app Contents on a Mac & in user's AppData/Local/Programs/Distrinet on Windows).
    return path.resolve(STATIC_PARENT, 'static', relativePath);
  }
  // A relative URL begins from just under the 'app' directory (for dev).
  return path.resolve(APP_PATH, 'static', relativePath);
}
