import { createSlice } from '@reduxjs/toolkit';
import envPaths from 'env-paths';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

// eslint-disable-next-line import/no-cycle
import { AppThunk, RootState } from '../../store';
import { Cache, Sources } from './distnetClasses';

const paths = envPaths('dist-task-list');
const SETTINGS_FILE = path.join(paths.config, 'settings.yml');

const fsPromises = fs.promises;

interface SettingsContents {
  type: string;
  payload: Sources;
}

interface DistnetState {
  settings: Sources;
  cache: Cache;
}

function newDistnetState(): DistnetState {
  return { settings: {}, cache: {} };
}

const settingsSlice = createSlice({
  name: 'distnet',
  initialState: newDistnetState(),
  reducers: {
    setSettings: (state, contents: SettingsContents) => {
      console.log('New distnet settings:', contents.payload);
      state.settings = contents.payload;
    },
  },
});

export const { setSettings } = settingsSlice.actions;

export const reloadSettings = (): AppThunk => (dispatch) => {
  fsPromises
    .readFile(SETTINGS_FILE)
    .then((resp) => resp.toString())
    .then((contents) => {
      const result = yaml.safeLoad(contents);
      return dispatch(setSettings(result));
    })
    .catch((err) => {
      console.log('Error retrieving settings:', err);
      return dispatch(setSettings('Error retrieving settings'));
    });
};

export default settingsSlice.reducer;

export const selectSettings = (state: RootState) => state.distnet.settings;
