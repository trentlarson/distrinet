// originally from https://github.com/loopmode/electron-webpack-static-examples/blob/master/src/renderer/utils/getStatic.ts
import electron from 'electron';
import path from 'path';
import fs from 'fs';
import process from 'process';

const dirname = module.__dirname;

const IS_PACKAGED = electron.remote.app.isPackaged;
const APP_PATH = electron.remote.app.getAppPath();

export default function getStatic(relativePath = '') {
  if (IS_PACKAGED) {
    return path.resolve(APP_PATH, '..', 'static', relativePath);
  }
  // A relative URL begins from just under the 'app' directory (for dev).
  return path.resolve(APP_PATH, 'static', relativePath);

  // Here's a path under the top level of the source (when running 'yarn dev')
  // ... but when packaged it always has a value of '/'
  // I think __dirname is from https://nodejs.org/api/modules.html#modules_dirname
  //return path.resolve(__dirname, 'app/static', relativePath);

  // Here's the solution from https://webpack.electron.build/using-static-assets
  // (However, let's not return a URL on dev and a file path on prod. Ug.)
  // return url.resolve(window.location.origin, relativePath); // requires this at top: import * as url from 'url';
  // window.location.origin ends up being 'file://' and 'url.resolve' ensures '/' before relative path if none exists

}
