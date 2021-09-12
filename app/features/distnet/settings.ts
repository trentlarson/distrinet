import envPaths from 'env-paths';
import fs from 'fs';
import path from 'path';
import url from 'url';

// eslint-disable-next-line import/no-cycle
import { APP_NAME } from './distnetClasses';

const paths = envPaths(APP_NAME);
export const SETTINGS_FILE = path.join(paths.config, 'settings.yml');

/**
 * return a Promise with the config file contents as a string
 * If an error occurs, the result is: { error: '...' }
 * */
export function loadSettingsFromFile(): Promise<string | { error: string }> {
  return fs.promises
    .readFile(SETTINGS_FILE)
    .then((resp) => resp.toString())
    .catch((err) => {
      console.error('Error retrieving settings:', err);
      return { error: `Error retrieving settings: ${err}` };
    });
}

/**
 * return a Promise saving the config text
 * In case of error, the result is: { error: '...' }
 * */
export function saveSettingsToFile(
  text: string
): Promise<void | { error: string }> {
  return fs.promises.writeFile(SETTINGS_FILE, text).catch((err) => {
    console.error('Error saving settings:', err);
    return { error: `Error saving settings: ${err}` };
  });
}

async function getIriFileName(sourceLocalUrl: string): Promise<string> {
  const filename: string = new url.URL(sourceLocalUrl).pathname;
  let containingDir: string = filename;
  let finalIriFile = '.iri';
  const sourceStats = await fs.promises.stat(filename);
  if (sourceStats.isDirectory()) {
    // good, it's the whole thing
  } else if (sourceStats.isFile()) {
    // good, it's a file
    const parsed = path.parse(filename);
    containingDir = parsed.dir;
    finalIriFile = `${parsed.base}.iri`;
  } else {
    // less good: it's not a file or directory
    throw Error(
      `Unable to get IRI because this source location is neither a file nor a directory: ${filename}`
    );
  }
  const wellKnownDir = path.join(containingDir, '.well-known');
  const iriFullPath = path.join(wellKnownDir, finalIriFile);
  return iriFullPath;
}

export async function readIriFromWellKnownDir(sourceLocalUrl: string): Promise<null | string> {
  const iriFullPath = await getIriFileName(sourceLocalUrl);
  return fs.promises.readFile(iriFullPath, { encoding: 'utf-8' });
}

/**
 Make a .well-known/FILE.iri file, and return a Promise with null result on success or with {error:'...'} on failure.
 */
export async function saveIriToWellKnownDir(
  sourceLocalUrl: string,
  iri: string
): Promise<null | { error: string }> {
  const iriFullPath = await getIriFileName(sourceLocalUrl);

  let wellKnownDirExists = false;
  await fs.promises
    .stat(wellKnownDir)
    .then((s) => {
      if (s.isDirectory()) {
        wellKnownDirExists = true;
      } else {
        throw Error(
          `The .well-known location exists but is not a directory here: ${containingDir}`
        );
      }
      return null;
    })
    .catch((err) => {
      // just continue, expecting that it doesn't exist and we should create it
      if (err.message && err.message.startsWith('ENOENT')) {
        // it doesn't exist, so we're good to continue
      } else {
        throw err;
      }
    });
  if (!wellKnownDirExists) {
    await fs.promises.mkdir(wellKnownDir);
  }
  // note that the writeFile would overwrite contents, and we don't want that
  await fs.promises
    .stat(iriFullPath)
    .then(() => {
      // something already exists, so that's not good
      throw Error(`The IRI file already exists here: ${iriFullPath}`);
    })
    .catch(() => {
      // continue, knowing that we'll create it
    });
  await fs.promises.writeFile(iriFullPath, iri);
  return null;
}
