import envPaths from 'env-paths';
import fs from 'fs';
import path from 'path';
import url from 'url';

import { APP_NAME } from './distnetClasses';

const fsPromises = fs.promises;
const paths = envPaths(APP_NAME);
const DEFAULT_HISTORY_DIR = path.join(paths.config, 'history');

export const historyDestFullPath = (workUrl: string) => {
  let pathParsed = path.parse(url.fileURLToPath(workUrl))
  return path.join(DEFAULT_HISTORY_DIR, pathParsed.dir, pathParsed.base);
};

/**
 return Promise of string of ISO time of file mtime, or null on error
 * */
export const retrieveHistoryReviewedDate = async (workUrl: string) => {
  let historyFile = historyDestFullPath(workUrl);
  return fsPromises
    .stat(historyFile)
    .then((stats) => {
      return stats.mtime.toISOString();
    })
    .catch((err) => {
      console.log(
        'Failed to determine history for file',
        historyFile.toString(),
        'because',
        err
      );
      return null;
    })
}
