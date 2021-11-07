import envPaths from 'env-paths';
import fs, { Dirent}  from 'fs';
import path from 'path';
import * as R from 'ramda';
import url from 'url';

import {
  APP_NAME,
  CacheData,
  ChangedFile,
  SettingsInternal,
  SourceInternal,
} from './distnetClasses';
import { historyDestFullPath } from './history';
import uriTools from './uriTools';

const fsPromises = fs.promises;

const paths = envPaths(APP_NAME);
const DEFAULT_CACHE_DIR = path.join(paths.config, 'cache');

/**
 * Convert the ID into a valid file name
 */
function sourceIdToFilename(sourceId: string) {
  // Remove all non-alphanumeric characters from the string.
  return R.map(
    (c) =>
      (c.charCodeAt(0) >= 48 && c.charCodeAt(0) <= 57) ||
      (c.charCodeAt(0) >= 65 && c.charCodeAt(0) <= 90) ||
      (c.charCodeAt(0) >= 97 && c.charCodeAt(0) <= 122)
        ? c
        : '_',
    Array.from(sourceId)
  ).join('');
}

/**
 * return a Promise that creates the cache folder
 * */
export const createCacheDir: () => Promise<void> = async () => {
  return fsPromises.mkdir(DEFAULT_CACHE_DIR, { recursive: true });
};

export function removeNulls<T>(array: Array<T | null>): Array<T> {
  // Lodash _.filter failed me with a Typescript error, and so did Ramda R.filter & R.reject.
  const result: Array<T> = [];
  for (let i = 0; i < array.length; i += 1) {
    const value = array[i];
    if (value !== null) {
      result.push(value);
    }
  }
  return result;
}

// sourcePath is expected to be a directory
// relative path is the path under sourceUrl to this place in the file tree
const loadSearchableChangedFilesPathed: (
  arg0: string,
  arg1: string,
  arg2: string
) => Promise<Array<ChangedFile | null>> = async (
  sourcePath: string,
  historyPath: string,
  relativePath: string
) => {
  const newFilePath = path.join(sourcePath, relativePath);
  const contents: Array<Dirent> =
    await fsPromises.readdir(newFilePath, { withFileTypes: true });

  const changedFiles = contents.map(async (dirent) => {
    const newRelativePath = path.join(relativePath, dirent.name);
    if (dirent.isFile()) {
      const stats = await fsPromises.stat(path.join(sourcePath, newRelativePath));
      const fileMtime = stats.mtime;
      const histMtime = await fsPromises.stat(path.join(historyPath, newRelativePath))
        .then((histStats) => {
          return histStats.mtime;
        })
        .catch(() => {
          // the history file must not exist, so continue with a 0 time
          return 0;
        })
      if (fileMtime > histMtime) {
        // There's a change!
        return [{
          file: newRelativePath,
          mtime: fileMtime.toISOString()
        } as ChangedFile];
      } else {
        return [null];
      }
    } else if (dirent.isDirectory()) {
      return await loadSearchableChangedFilesPathed(
        sourcePath,
        historyPath,
        newRelativePath
      );
    } else {
      return [null];
    }
  });
  return R.flatten(await Promise.all(changedFiles));
}

// sourcePath is expected to be a directory
const loadSearchableChangedFiles: (
  arg: string
) => Promise<Array<ChangedFile | null>> = async (
  sourcePath: string
) => {
  return loadSearchableChangedFilesPathed(
    sourcePath,
    historyDestFullPath(sourcePath),
    ''
  );
}

/**
 * cacheDir is directory where cached data will be saved; it defaults to DEFAULT_CACHE_DIR
 * return CacheData for the first source URL that works, or null if none work (may update local file)
 */
export const loadOneSourceContents: (
  arg0: SourceInternal,
  arg1: string
) => Promise<CacheData | null> = async (
  source: SourceInternal,
  cacheDir: string
) => {
  console.log('Trying to cache', source.workUrl, ' in memory...');

  const sourceUrl = new url.URL(source.workUrl);
  if (sourceUrl.protocol === uriTools.FILE_PROTOCOL) {

    const sourcePath: string = url.fileURLToPath(sourceUrl);
    return fsPromises
      .stat(sourcePath)
      .then((stats) => {
        if (stats.isFile()) {
          return fsPromises
            // without the encoding, readFile returns a Buffer
            .readFile(sourcePath, { encoding: 'utf8' })
            .then((contents: string) => {
              return {
                sourceId: source.id,
                sourceUrl: sourceUrl.toString(),
                localFile: sourcePath,
                contents,
                fileCache: [],
                updatedDate: stats.mtime.toISOString(),
              } as CacheData;
            })
            .catch((err) => {
              console.log('... failed to read file', sourceUrl.toString(), 'for caching because', err); // eslint-disable-line max-len
              return null;
            });
        } else if (stats.isDirectory()) {
          return loadSearchableChangedFiles(sourceUrl.toString())
            .then((fullFileCache: Array<ChangedFile | null>) => {
              const fileCache: Array<ChangedFile> = removeNulls(fullFileCache);
              return {
                sourceId: source.id,
                sourceUrl: sourceUrl.toString(),
                localFile: sourcePath,
                contents: undefined,
                fileCache,
                updatedDate: stats.mtime.toISOString(),
              } as CacheData;
            })
            .catch((err) => {
              console.log('... failed to read files inside', sourceUrl.toString(), 'because', err); // eslint-disable-line max-len
              return null;
            });
        } else {
          console.log('Found non-file non-dir ' + sourceUrl);
          return null;
        }
      })
      .catch((err) => { // couldn't stat the file
        console.log('... failed to find file stats for', sourceUrl.toString(), 'for caching because', err); // eslint-disable-line max-len
        return null;
      });
  } else {
    // not a 'file:' protocol
    return fetch(sourceUrl.toString())
      .then((response: Response) => {
        if (!response.ok) {
          console.log(`Failed to retrieve URL ${sourceUrl.toString()} for caching due to response code ${response.status}`); // eslint-disable-line max-len
          return null;
        }
        const cacheFile: string = path.join(
          cacheDir || DEFAULT_CACHE_DIR,
          sourceIdToFilename(source.id)
        );
        console.log('... successfully retrieved URL', sourceUrl.toString(), 'response, so will write that to a local cache file', cacheFile); // eslint-disable-line max-len

        let contents: string;
        return fsPromises
          .unlink(cacheFile)
          .catch(() => {
            // we're fine if it doesn't exit
          })
          .then(() => {
            return response.text(); // we're assuming the file is not binary (see task read-binary)
          })
          .then((data: string) => {
            contents = data;
            return fsPromises.writeFile(cacheFile, contents);
          })
          .then(() => {
            return {
              sourceId: source.id,
              sourceUrl: sourceUrl.toString(),
              localFile: cacheFile,
              contents,
              fileCache: [],
              updatedDate: new Date().toISOString(),
            } as CacheData;
          })
          .catch((err) => {
            console.log('... failed to cache URL', sourceUrl.toString(), 'because', err); // eslint-disable-line max-len
            return null;
          });
      })
      .catch((err) => {
        console.log('... failed to retrieve URL', sourceUrl.toString(), 'and cache because', err); // eslint-disable-line max-len
        return null;
      });
  }
};

const loadOneOfTheSources: (
  arg0: Array<SourceInternal>,
  arg1: string,
  arg2: string
) => Promise<CacheData | null> = async (sources, sourceId, cacheDir) => {
  const source = R.find((src) => src.id === sourceId, sources);
  if (source) {
    return loadOneSourceContents(source, cacheDir);
  }
  console.error('Failed to retrieve and cache any sources for', sourceId);
  return null;
};

/**
 * return CacheData or null if there was an error (no state change)
 */
export const reloadOneSourceIntoCache: (
  arg0: string,
  arg1: SettingsInternal
) => Promise<CacheData | null> = (sourceId, settings) => {
  return loadOneOfTheSources(settings.sources, sourceId, DEFAULT_CACHE_DIR);
};

export const reloadAllSourcesIntoCache: (
  settings: SettingsInternal
) => Promise<Array<CacheData | null>> = (settings) => {
  const { sources } = settings;
  const sourceReloads = R.isNil(sources)
    ? []
    : sources.map((s: SourceInternal) =>
        reloadOneSourceIntoCache(s.id, settings)
      );
  return Promise.all(sourceReloads);
};
