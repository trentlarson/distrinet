import envPaths from 'env-paths';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

// eslint-disable-next-line import/no-cycle
import { APP_NAME } from './distnetClasses';

const paths = envPaths(APP_NAME);
const SETTINGS_FILE = path.join(paths.config, 'settings.yml');

const fsPromises = fs.promises;

/**
 * return a Promise with the YAML settings file contents
 * */
function reloadSettings(): Promise<string> {
  return fsPromises
    .readFile(SETTINGS_FILE)
    .then((resp) => resp.toString())
    .then((contents) => {
      const result = yaml.safeLoad(contents);
      return result;
    })
    .catch((err) => {
      console.log('Error retrieving settings:', err);
      return { error: `Error retrieving settings${err}` };
    });
}

export default reloadSettings;
