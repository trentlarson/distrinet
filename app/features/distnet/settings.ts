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

interface WellKnownAndIri {
  wellKnownDir: string;
  iriFile: string;
}

const retrieveIriFileName = async (
  localUrl: string
): Promise<WellKnownAndIri> => {
  const filename: string = url.fileURLToPath(localUrl);
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
    // ungood: it's not a file or directory
    throw Error(
      `Unable to get IRI because this source location is neither a file nor a directory: ${filename}`
    );
  }
  const wellKnownDir = path.join(containingDir, '.well-known');
  const iriFile = path.join(wellKnownDir, finalIriFile);
  return { wellKnownDir, iriFile };
};

/**
 Do not use externally: it's only being exported here for test purposes.
 */
export const retrieveIriFileNameForTesting = retrieveIriFileName;

export interface IriResults {
  iri?: string; // optional because it may not exist
  iriFile: string; // always a value; if it doesn't exist, this is the file where it would be located
}

export function isIriResults(contents: any): contents is IriResults {
  return (
    typeof contents !== 'undefined' &&
    (contents as IriResults).iriFile !== undefined
  );
}

export interface ErrorResult {
  error: string;
}

export function isErrorResult(contents: any): contents is ErrorResult {
  return (
    typeof contents !== 'undefined' &&
    (contents as ErrorResult).error !== undefined
  );
}

/**
 return { iri: the IRI found on the file system or null if it doesn't exist, iriFile: the file that should contain the IRI}
 */
export async function readIriFromWellKnownDir(
  sourceLocalUrl: string
): Promise<IriResults> {
  const { iriFile } = await retrieveIriFileName(sourceLocalUrl);
  return fs.promises
    .readFile(iriFile, { encoding: 'utf-8' })
    .then((s) => ({ iri: s.trim(), iriFile }))
    .catch((err) => {
      if (err.message && err.message.startsWith('ENOENT')) {
        // it doesn't exist
        return { iriFile };
      }
      throw err;
    });
}

/**
 Make a .well-known/FILE.iri file, and return a Promise with IRI file name as result on success or with {error:'...'} on failure.
 Throws error if something goes wrong.
 */
export async function saveIriToWellKnownDir(
  sourceLocalUrl: string,
  iri: string
): Promise<string> {
  const { wellKnownDir, iriFile } = await retrieveIriFileName(sourceLocalUrl);

  let wellKnownDirExists = false;
  await fs.promises
    .stat(wellKnownDir)
    .then((s) => {
      if (s.isDirectory()) {
        wellKnownDirExists = true;
      } else {
        throw Error(
          `The .well-known location exists but is not a directory here: ${sourceLocalUrl}`
        );
      }
      return iriFile;
    })
    .catch((err) => {
      // just continue, expecting that it doesn't exist and we should create it
      if (err.message && err.message.startsWith('ENOENT')) {
        // it doesn't exist, so we're good to continue
        return iriFile;
      }
      throw err;
    });
  if (!wellKnownDirExists) {
    await fs.promises.mkdir(wellKnownDir);
  }
  // note that the writeFile would overwrite contents, and we don't want that
  await fs.promises
    .stat(iriFile)
    .then(() => {
      // something already exists, so that's not good
      throw Error(`The IRI file already exists here: ${iriFile}`);
    })
    .catch(() => {
      // continue, knowing that we'll create it
    });
  await fs.promises.writeFile(iriFile, iri);
  return iriFile;
}
