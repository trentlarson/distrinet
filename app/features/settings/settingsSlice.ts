import { createSlice } from '@reduxjs/toolkit';
import fs from 'fs';
import yaml from 'js-yaml';
import _ from 'lodash';
import os from 'os';
import url from 'url';

// eslint-disable-next-line import/no-cycle
import { AppThunk, RootState } from '../../store';

const fsPromises = fs.promises;

const settingsSlice = createSlice({
  name: 'settings',
  initialState: { value: {} },
  reducers: {
    setCached: (state, result) => {
      const { source } = result.payload;
      const otherSources = _.filter(
        state.value.sources,
        (otherSource) => otherSource.id !== source.id
      );
      const newSource = _.cloneDeep(source);
      newSource.cache = {
        localFile: 'WELL... NEW FILE',
        resolvedDate: new Date().toISOString(),
        data: null,
      };
      state.value = { sources: _.concat(otherSources, newSource) };
    },
    setSettings: (state, contents) => {
      console.log('Retrieved settings:', contents.payload);
      state.value = contents.payload;
    },
  },
});

export const { setCached, setSettings } = settingsSlice.actions;

export const reloadSettings = (): AppThunk => (dispatch) => {
  const fileUrl = `file://${os.homedir()}/.dist-task-list-settings.yml`;
  fsPromises
    .readFile(new url.URL(fileUrl))
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

export const reloadSource = (sourceId: string): AppThunk => async (
  dispatch,
  getState
) => {
  const source = _.find(
    getState().settings.value.sources,
    (src) => src.id === sourceId
  );
  if (source && source.urls) {
    let succeeded = false;
    let index = 0;
    while (!succeeded && index < source.urls.length) {
      console.log('Trying URL', source.urls[index].url, '...');
      const sourceUrl = source.urls[index].url;
      if (sourceUrl.startsWith('file:')) {
        // eslint-disable-next-line no-await-in-loop
        succeeded = await fsPromises
          .readFile(new url.URL(sourceUrl))
          .then((resp) => resp.toString())
          .then((contents) => {
            const result = yaml.safeLoad(contents);
            console.log('Read file contents', result);
            return true;
          })
          // eslint-disable-next-line no-loop-func
          .catch((err) => {
            console.log('Error reading file:', err);
            index += 1;
            return false;
          });
      } else {
        // eslint-disable-next-line no-await-in-loop
        succeeded = await fetch(new url.URL(source.urls[index].url))
          .then((contents) => {
            console.log('Fetched URL contents', contents);
            return true;
          })
          // eslint-disable-next-line no-loop-func
          .catch((err) => {
            console.log('Failed to fetch URL', source.urls[index].url);
            console.log(err);
            index += 1;
            return false;
          });
      }
    }
    if (succeeded) {
      console.log('Successfully retrieved file for', source.urls[index]);
    }
    return dispatch(setCached({ source }));
  }
  return null;
};
