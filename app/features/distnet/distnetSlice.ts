import _ from 'lodash';
import { createSlice } from '@reduxjs/toolkit';
import yaml from 'js-yaml';

import reloadSettings from './settings';
import { reloadAllSourcesIntoCache, reloadOneSourceIntoCache } from './cache';

/**
 * This is the main object stored into the state with the name 'distnet'.
 * */
interface DistnetState {
  settings: Sources;
  settingsErrorMessage: string;
  settingsText: string;
  cache: Cache;
}

interface SettingsPayload {
  type: string;
  payload: string;
}

interface CachePayload {
  type: string;
  payload: CacheData;
}

interface AllCachePayload {
  type: string;
  payload: Array<CacheData>;
}

const distnetSlice = createSlice({
  name: 'distnet',
  initialState: {
    settings: {},
    settingsErrorMessage: null,
    settingsText: null,
    cache: {},
  } as DistnetState,
  reducers: {
    setSettingsState: (state: RootState, contents: SettingsPayload) => {
      console.log('New distnet settings text:\n', contents.payload);
      state.settingsText = contents.payload;
      try {
        state.settings = yaml.safeLoad(contents.payload);
        console.log('New distnet settings object:\n', state.settings);
        state.settingsErrorMessage = null;
      } catch (error) {
        // probably a YAMLException https://github.com/nodeca/js-yaml/blob/master/lib/js-yaml/exception.js
        state.settingsErrorMessage = error.message;
        console.log(
          'New distnet settings failed YAML parse:\n',
          state.settingsErrorMessage
        );
      }
    },
    setCachedStateForAll: (state: RootState, result: AllCachePayload) => {
      const newData: Array<CacheData> = result.payload;
      console.log('Refreshing from', newData);
      for (let i = 0; i < newData.length; i += 1) {
        state.cache[newData[i].sourceId] = newData[i];
      }
      console.log('Finished refreshing cache results for all sources.');
    },
    setCachedStateForOne: (state: RootState, result: CachePayload) => {
      state.cache[result.payload.sourceId] = result.payload;
      console.log('Cached new local file for', result.payload.sourceId);
    },
  },
});

export const {
  setCachedStateForAll,
  setCachedStateForOne,
  setSettingsState,
} = distnetSlice.actions;

export const dispatchSettings = (): AppThunk => async (dispatch) => {
  const result: string = await reloadSettings();
  return dispatch(setSettingsState(result));
};

export const dispatchCacheForAll = (): AppThunk => async (
  dispatch,
  getState
) => {
  const allCaches: Array<CacheData> = await reloadAllSourcesIntoCache(getState);
  const result = _.filter(allCaches, (c) => c != null);
  return dispatch(setCachedStateForAll(result));
};

export const dispatchCacheForId = (sourceId: string): AppThunk => async (
  dispatch,
  getState
) => {
  const result: CacheData = await reloadOneSourceIntoCache(sourceId, getState);
  return dispatch(setCachedStateForOne(result));
};

export default distnetSlice.reducer;
