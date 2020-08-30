import envPaths from 'env-paths';
import fs from 'fs';
import path from 'path';

// eslint-disable-next-line import/no-cycle
import { APP_NAME } from './distnetClasses';

const paths = envPaths(APP_NAME);
export const SETTINGS_FILE = path.join(paths.config, 'settings.yml');

const fsPromises = fs.promises;

/**
 * return a Promise with the config file contents as a string
 * If an error occurs, the result is: { error: '...' }
 * */
export function loadSettingsFromFile(): Promise<string | { error: string }> {
  return fsPromises
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
  return fsPromises.writeFile(SETTINGS_FILE, text).catch((err) => {
    console.error('Error saving settings:', err);
    return { error: `Error saving settings: ${err}` };
  });
}
