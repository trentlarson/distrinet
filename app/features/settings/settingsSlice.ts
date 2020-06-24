import { createSlice } from '@reduxjs/toolkit';
import fs from 'fs';
import yaml from 'js-yaml';
import os from 'os';
import path from 'path';

// eslint-disable-next-line import/no-cycle
import { AppThunk, RootState } from '../../store';

const SETTINGS_FILE = path.join(os.homedir(), '.dist-task-list-settings.yml');

const fsPromises = fs.promises;

const settingsSlice = createSlice({
  name: 'settings',
  initialState: { value: {} },
  reducers: {
    setSettings: (state, contents) => {
      console.log('Retrieved settings:', contents.payload);
      state.value = contents.payload;
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

export const selectSettings = (state: RootState) => state.settings.value;
