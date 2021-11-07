import envPaths from 'env-paths';
import fs from 'fs';
import path from 'path';
import url from 'url';

import { APP_NAME } from './distnetClasses';

const fsPromises = fs.promises;
const paths = envPaths(APP_NAME);
const DEFAULT_HISTORY_DIR = path.join(paths.config, 'history');

export const historyDestFullPathFromPaths = (
  workPath: string,
  relativePath: string
) => {
  return path.join(DEFAULT_HISTORY_DIR, workPath, relativePath);
};

export const historyDestFullPathFromPath = (workPath: string) => {
  const pathParsed = path.parse(workPath);
  return historyDestFullPathFromPaths(pathParsed.dir, pathParsed.base);
};

export const historyDestFullPathFromUrl = (workUrl: string) => {
  return historyDestFullPathFromPath(url.fileURLToPath(workUrl));
};

/**
 return Promise of string of ISO of mtime for file (or a thrown error, eg. if it doesn't exist)
 * */
// eslint-disable-next-line max-len
export const retrieveFileMtime: (arg0: string) => Promise<string> = async (
  filePath: string
) => {
  return fsPromises.stat(filePath).then((stats) => {
    return stats.mtime.toISOString();
  });
};

/**
 return Promise of string of ISO of mtime for history file for workUrl, or null on error
 * */
export const retrieveHistoryReviewedDate = async (workUrl: string) => {
  const historyPath = historyDestFullPathFromUrl(workUrl);
  return retrieveFileMtime(historyPath).catch((err) => {
    if (err.message && err.message.startsWith('ENOENT')) {
      // We expect that no history exists at first.
    } else {
      console.log('Failed to determine mtime for file', historyPath, err);
    }
    return null;
  });
};
