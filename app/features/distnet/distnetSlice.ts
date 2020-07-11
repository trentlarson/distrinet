import _ from 'lodash';
import { createSlice } from '@reduxjs/toolkit';
import yaml from 'js-yaml';

// eslint-disable-next-line import/no-cycle
import { AppThunk, RootState } from '../../store';
import { CacheData, Payload, Source } from './distnetClasses';
import { loadSettings, saveSettings } from './settings';
import { reloadAllSourcesIntoCache, reloadOneSourceIntoCache } from './cache';

/**
 * This is the main object stored into the state with the name 'distnet'.
 * */
interface DistnetState {
  settings: Array<Source>;
  settingsErrorMessage: string;
  settingsText: string;
  settingsSaveErrorMessage: string;
  cache: Cache;
}

const distnetSlice = createSlice({
  name: 'distnet',
  initialState: {
    settings: {},
    settingsErrorMessage: null as string | null,
    settingsText: null as string | null,
    settingsSaveErrorMessage: null as string | null,
    cache: {},
  } as DistnetState,
  reducers: {
    setSettingsState: (state: RootState, contents: Payload<string>) => {
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
    setSettingsSaveErrorMessage: (
      state: RootState,
      contents: Payload<string | null>
    ) => {
      state.settingsSaveErrorMessage = contents.payload;
    },
    setCachedStateForAll: (
      state: RootState,
      result: Payload<Array<CacheData>>
    ) => {
      const newData: Array<CacheData> = result.payload;
      console.log('Refreshing from', newData);
      for (let i = 0; i < newData.length; i += 1) {
        state.cache[newData[i].sourceId] = newData[i];
      }
      console.log('Finished refreshing cache results for all sources.');
    },
    setCachedStateForOne: (state: RootState, result: Payload<CacheData>) => {
      state.cache[result.payload.sourceId] = result.payload;
      console.log('Cached new local file for', result.payload.sourceId);
    },
  },
});

export const {
  setCachedStateForAll,
  setCachedStateForOne,
  setSettingsErrorMessage,
  setSettingsSaveErrorMessage,
  setSettingsState,
} = distnetSlice.actions;

export const textIntoState = (text: string): AppThunk => (dispatch) => {
  dispatch(setSettingsState(text));
};

export const dispatchLoadSettings = (): AppThunk => async (dispatch) => {
  const result = await loadSettings();
  console.log('New distnet settings text loaded:\n', result);
  dispatch(setSettingsState(result));
};

export const dispatchSaveSettings = (): AppThunk => async (
  dispatch,
  getState
) => {
  if (
    _.isNil(getState().distnet.settingsText) ||
    getState().distnet.settingsText === ''
  ) {
    dispatch(
      setSettingsSaveErrorMessage(
        "Sorry, but I won't save an empty config file."
      )
    );
  } else {
    const result = await saveSettings(getState().distnet.settingsText);
    if (result && result.error) {
      dispatch(setSettingsSaveErrorMessage(result.error));
    } else {
      dispatch(setSettingsState(getState().distnet.settingsText));
      dispatch(setSettingsSaveErrorMessage(null));
    }
  }
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
