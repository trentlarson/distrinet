import envPaths from 'env-paths';
import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import url from 'url';

import { APP_NAME, CacheData } from './distnetClasses';

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
      (c.codePointAt() >= 48 && c.codePointAt() <= 57) ||
      (c.codePointAt() >= 65 && c.codePointAt() <= 90) ||
      (c.codePointAt() >= 97 && c.codePointAt() <= 122)
  ).join('');
}

interface CacheInfo {
  localFile: string;
}

export const reloadOneSourceIntoCache: CacheData = async (
  sourceId: string,
  getState
) => {
  const source = _.find(
    getState().distnet.settings.sources,
    (src) => src.id === sourceId
  );
  if (source && source.urls) {
    let cacheInfo: CacheInfo = null;
    let index = 0;
    console.log(
      'Trying URLs',
      source.urls.map((u) => u.url),
      '...'
    );
    while (!cacheInfo && index < source.urls.length) {
      const sourceUrl = new url.URL(source.urls[index].url);
      console.log('... trying URL', sourceUrl.toString(), '...');
      if (sourceUrl.protocol === 'file:') {
        // eslint-disable-next-line no-await-in-loop
        cacheInfo = await fsPromises
          .readFile(sourceUrl)
          .then((contents) => {
            return {
              sourceId,
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
        // eslint-disable-next-line no-await-in-loop
        cacheInfo = await fetch(sourceUrl)
          // eslint-disable-next-line no-loop-func
          .then((response: Response) => {
            const cacheDir =
              (getState().distnet.settings.fileSystem &&
                getState().distnet.settings.fileSystem.cacheDir) ||
              DEFAULT_CACHE_DIR;
            const cacheFile = path.join(cacheDir, sourceIdToFilename(sourceId));
            console.log(
              '... successfully fetched URL',
              sourceUrl.toString(),
              'response, so will write that to a local cache file',
              cacheFile
            );

            let contents = null;
            return fsPromises
              .unlink(cacheFile)
              .catch(() => {
                // we're fine if it doesn't exit
              })
              .then(() => {
                return response.text(); // we're assuming the file is not binary (see task read-binary)
              })
              .then((data) => {
                contents = data;
                return fsPromises.writeFile(cacheFile, contents);
              })
              .then(() => {
                return {
                  sourceId,
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
    }
    if (cacheInfo) {
      console.log(
        'Successfully retrieved file for',
        source,
        'and cached at',
        cacheInfo
      );
      return { sourceId, ...cacheInfo };
    }
    console.log('Failed to retrieve file for', source);
  }
  return null;
};

export const reloadAllSourcesIntoCache: Array<CacheData> = async (getState) => {
  const { sources } = getState().distnet.settings;
  const sourceReloads = _.isEmpty(sources)
    ? []
    : sources.map((s) => reloadOneSourceIntoCache(s.id, getState));
  return Promise.all(sourceReloads);
};
