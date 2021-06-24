import envPaths from 'env-paths';
import fs from 'fs';
import path from 'path';
import * as R from 'ramda';
import url from 'url';

import {
  APP_NAME,
  CacheData,
  Settings,
  Source,
  UrlData,
} from './distnetClasses';

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

/**
 * cacheDir is directory where cached data will be saved; defaults to DEFAULT_CACHE_DIR
 * return CacheData for the first source URL that works, or null if none work (may update local file)
 */
export const loadOneSourceContents: (
  arg0: Source,
  arg1: string
) => Promise<CacheData | null> = async (source: Source, cacheDir: string) => {
  let cacheInfo: CacheData | null = null;

  let index = 0;
  console.log(
    'Trying to retrieve URLs',
    source.urls.map((u: UrlData) => u.url),
    'for caching...'
  );
  while (!cacheInfo && index < source.urls.length) {
    const thisIndex = index;
    index += 1; // because an error before incrementing causes an infinte loop
    try {
      const sourceUrl = new url.URL(source.urls[thisIndex].url);
      if (sourceUrl.protocol === 'file:') {
        console.log(
          '... trying to read file',
          sourceUrl.toString(),
          'for caching...'
        );

        // eslint-disable-next-line no-await-in-loop
        cacheInfo = await fsPromises
          // without the encoding, readFile returns a Buffer
          .readFile(sourceUrl, { encoding: 'utf8' })
          .then((contents) => {
            return (
              fsPromises
                .stat(sourceUrl)
                .then((stats) => {
                  const modDate = stats.mtime;

                  return {
                    sourceId: source.id,
                    sourceUrl: sourceUrl.toString(),
                    localFile: url.fileURLToPath(sourceUrl),
                    contents,
                    updatedDate: modDate.toISOString(),
                  };
                })
                // eslint-disable-next-line no-loop-func
                .catch((err) => {
                  console.log(
                    '... failed to read file',
                    sourceUrl.toString(),
                    'for caching because',
                    err
                  );
                  return null;
                })
            );
          })
          .catch((err) => {
            // couldn't stat the file
            console.log(
              '... failed to find file stats for',
              sourceUrl.toString(),
              'for caching because',
              err
            );
            return null;
          });
      } else {
        console.log(
          '... trying to retrieve URL',
          sourceUrl.toString(),
          ' for caching...'
        );
        // eslint-disable-next-line no-await-in-loop
        cacheInfo = await fetch(sourceUrl.toString())
          // eslint-disable-next-line no-loop-func
          .then((response: Response) => {
            if (!response.ok) {
              throw Error(
                `Failed to retrieve URL ${sourceUrl.toString()} for caching due to response code ${
                  response.status
                }`
              );
            }
            const cacheFile = path.join(
              cacheDir || DEFAULT_CACHE_DIR,
              sourceIdToFilename(source.id)
            );
            console.log(
              '... successfully retrieved URL',
              sourceUrl.toString(),
              'response, so will write that to a local cache file',
              cacheFile
            );

            let contents: string;
            // eslint-disable-next-line promise/no-nesting
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
                  updatedDate: new Date().toISOString(),
                };
              })
              .catch((err) => {
                console.log(
                  '... failed to cache URL',
                  sourceUrl.toString(),
                  'because',
                  err
                );
                return null;
              });
          })
          // eslint-disable-next-line no-loop-func
          .catch((err) => {
            console.log(
              '... failed to retrieve URL',
              sourceUrl.toString(),
              'and cache because',
              err
            );
            return null;
          });
      }
    } catch (e) {
      // probably a TypeError for a bad URL (including null or blank URLs)
      console.log(
        'Failed to retrieve and cache URL',
        source.urls[thisIndex].url,
        'in source',
        source,
        e
      );
    }
  }
  if (cacheInfo) {
    console.log(
      `Successfully retrieved ${cacheInfo.sourceUrl} and cached at ${cacheInfo.localFile}`
    );
    return cacheInfo;
  }
  console.error('Failed to retrieve and cache file for', source);
  return null;
};

export const loadOneOfTheSources: (
  arg0: Array<Source>,
  arg1: string,
  arg2: string
) => Promise<CacheData | null> = async (sources, sourceId, cacheDir) => {
  const source = R.find((src) => src.id === sourceId, sources);
  if (source && source.urls) {
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
  arg1: Settings
) => Promise<CacheData | null> = (sourceId, settings) => {
  return loadOneOfTheSources(settings.sources, sourceId, DEFAULT_CACHE_DIR);
};

export const reloadAllSourcesIntoCache: (
  settings: Settings
) => Promise<Array<CacheData | null>> = (settings) => {
  const { sources } = settings;
  const sourceReloads = R.isNil(sources)
    ? []
    : sources.map((s: Source) => reloadOneSourceIntoCache(s.id, settings));
  return Promise.all(sourceReloads);
};
