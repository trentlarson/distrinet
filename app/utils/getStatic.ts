// from https://github.com/loopmode/electron-webpack-static-examples/blob/master/src/renderer/utils/getStatic.ts
import path from 'path';

const isDevelopment = process.env.NODE_ENV !== 'production';

// see https://github.com/electron-userland/electron-webpack/issues/241#issuecomment-582920906
export default function getStatic(relativePath = '') {
  if (isDevelopment) {
    // A relative URL begins from just under the 'app' directory (for dev).

    // Here's the solution from https://webpack.electron.build/using-static-assets
    // return url.resolve(window.location.origin, relativePath); // requires at top: import * as url from 'url';
    // window.location.origin ends up being 'file://' and 'url.resolve' ensures '/' before relative path if none exists

    // However, let's not return a URL on dev and a file path on prod. Ug.

    // Here's a path under the top level of the source (when running 'yarn dev').
    return path.resolve('app/static', relativePath);
  }
  // __static is something magic from electron-webpack: https://webpack.electron.build/using-static-assets
  return path.resolve(__static, relativePath);
}
