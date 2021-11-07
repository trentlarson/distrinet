import envPaths from 'env-paths';
import fs from 'fs';
import path from 'path';
import url from 'url';

import { APP_NAME } from './distnetClasses';

const fsPromises = fs.promises;
const paths = envPaths(APP_NAME);
const DEFAULT_HISTORY_DIR = path.join(paths.config, 'history');

export const historyDestFullPath = (workUrl: string) => {
  const pathParsed = path.parse(url.fileURLToPath(workUrl));
  return path.join(DEFAULT_HISTORY_DIR, pathParsed.dir, pathParsed.base);
};

/**
 return Promise of string of ISO of mtime for file (or a thrown error, eg. if it doesn't exist)
 * */
// eslint-disable-next-line max-len
export const retrieveFileMtime: (arg0: string) => Promise<string> = async (filePath: string) => {
  return fsPromises
    .stat(filePath)
    .then((stats) => {
      return stats.mtime.toISOString();
    });
}

/**
 return Promise of string of ISO of mtime for history file for workUrl, or null on error
 * */
export const retrieveHistoryReviewedDate = async (workUrl: string) => {
  return retrieveFileMtime(historyDestFullPath(workUrl))
    .catch((err) => {
      console.log(
        'Failed to determine mtime for file',
        workUrl.toString(),
        err,
        '-- but for a non-existent directory that is expected, so returning null.'
      );
      return null;
    });
};
