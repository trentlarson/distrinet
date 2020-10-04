import envPaths from 'env-paths';
import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import url from 'url';

import { APP_NAME, CacheData, Source, UrlData } from './distnetClasses';

const fsPromises = fs.promises;

const paths = envPaths(APP_NAME);
const DEFAULT_CACHE_DIR = path.join(paths.config, 'cache');

/**
 * Convert the ID into a valid file name
 */
function sourceIdToFilename(sourceId: string) {
  // Remove all non-alphanumeric characters from the string.
  return _.filter(
    Array.from(sourceId),
    (c) =>
      (c.charCodeAt(0) >= 48 && c.charCodeAt(0) <= 57) ||
      (c.charCodeAt(0) >= 65 && c.charCodeAt(0) <= 90) ||
      (c.charCodeAt(0) >= 97 && c.charCodeAt(0) <= 122)
  ).join('');
}

/**
 * return a Promise that creates the cache folder
 * */
export const createCacheDir: () => Promise<void> = async () => {
  return fsPromises.mkdir(DEFAULT_CACHE_DIR, { recursive: true });
};

export const reloadOneSourceIntoCache: (
  sourceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getState: () => any
) => Promise<CacheData | null> = async (sourceId: string, getState) => {
  const source = _.find(
    getState().distnet.settings.sources,
    (src) => src.id === sourceId
  );
  let cacheInfo: CacheData | null = null;
  if (source && source.urls) {
    let index = 0;
    console.log(
      'Trying URLs',
      source.urls.map((u: UrlData) => u.url),
      '...'
    );
    while (!cacheInfo && index < source.urls.length) {
      const thisIndex = index;
      index += 1; // because an error before incrementing causes an infinte loop
      try {
        const sourceUrl = new url.URL(source.urls[thisIndex].url);
        if (sourceUrl.protocol === 'file:') {
          console.log('... trying URL', sourceUrl.toString(), '...');
          // eslint-disable-next-line no-await-in-loop
          cacheInfo = await fsPromises
            // without the encoding, readFile returns a Buffer
            .readFile(sourceUrl, { encoding: 'utf8' })
            .then((contents) => {
              return {
                sourceId,
                sourceUrl: sourceUrl.toString(),
                localFile: url.fileURLToPath(sourceUrl),
                contents,
                date: new Date().toISOString(),
              };
            })
            // eslint-disable-next-line no-loop-func
            .catch((err) => {
              console.log(
                '... failed to read file',
                sourceUrl.toString(),
                'because',
                err
              );
              index += 1;
              return null;
            });
        } else {
          console.log('... trying URL', sourceUrl.toString(), '...');
          // eslint-disable-next-line no-await-in-loop
          cacheInfo = await fetch(sourceUrl.toString())
            // eslint-disable-next-line no-loop-func
            .then((response: Response) => {
              if (!response.ok) {
                throw Error(
                  `Failed to get URL${sourceUrl.toString()}due to response code${
                    response.status
                  }`
                );
              }
              const cacheDir =
                (getState().distnet.settings.fileSystem &&
                  getState().distnet.settings.fileSystem.cacheDir) ||
                DEFAULT_CACHE_DIR;
              const cacheFile = path.join(
                cacheDir,
                sourceIdToFilename(sourceId)
              );
              console.log(
                '... successfully fetched URL',
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
                    sourceId,
                    sourceUrl: sourceUrl.toString(),
                    localFile: cacheFile,
                    contents,
                    date: new Date().toISOString(),
                  };
                })
                .catch((err) => {
                  console.log(
                    '... failed to cache URL',
                    sourceUrl.toString(),
                    'because',
                    err
                  );
                  index += 1;
                  return null;
                });
            })
            // eslint-disable-next-line no-loop-func
            .catch((err) => {
              console.log(
                '... failed to fetch URL',
                sourceUrl.toString(),
                'because',
                err
              );
              index += 1;
              return null;
            });
        }
      } catch (e) {
        // probably a TypeError for a bad URL (including null or blank URLs)
        console.log(
          'Got error loading URL',
          source.urls[thisIndex].url,
          'in source',
          source,
          e
        );
      }
    }
    if (cacheInfo) {
      console.log(
        `Successfully retrieved file for ${source.sourceUrl} and cached at ${cacheInfo.localFile}`
      );
      return cacheInfo;
    }
    console.error('Failed to retrieve and cache file for', source);
    return null;
  }
  console.error('Failed to retrieve and cache any sources for', sourceId);
  return null;
};

export const reloadAllSourcesIntoCache: (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getState: () => any
) => Promise<Array<CacheData | null>> = async (getState) => {
  const { sources } = getState().distnet.settings;
  const sourceReloads = _.isEmpty(sources)
    ? [new Promise(() => Promise.resolve([] as Array<CacheData>))]
    : sources.map((s: Source) => reloadOneSourceIntoCache(s.id, getState));
  return Promise.all(sourceReloads);
};
