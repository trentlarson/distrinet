import { createSlice } from '@reduxjs/toolkit';
import yaml from 'js-yaml';

// eslint-disable-next-line import/no-cycle
import { AppThunk } from '../../store';
import { CacheData, DistnetState, Payload } from './distnetClasses';
import { loadSettings, saveSettingsToFile } from './settings';
import { reloadAllSourcesIntoCache, reloadOneSourceIntoCache } from './cache';

const distnetSlice = createSlice({
  name: 'distnet',
  initialState: {
    settings: { sources: [] },
    settingsErrorMessage: null,
    settingsText: null,
    settingsSaveErrorMessage: null,
    cache: {},
  } as DistnetState,
  reducers: {
    setSettingsState: (state, contents: Payload<string>) => {
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
    setSettingsErrorMessage: (state, contents: Payload<string | null>) => {
      state.settingsErrorMessage = contents.payload;
    },
    setSettingsSaveErrorMessage: (state, contents: Payload<string | null>) => {
      state.settingsSaveErrorMessage = contents.payload;
    },
    setCachedStateForAll: (state, result: Payload<Array<CacheData>>) => {
      const newData: Array<CacheData> = result.payload;
      console.log('Refreshing from', newData);
      for (let i = 0; i < newData.length; i += 1) {
        state.cache[newData[i].sourceId] = newData[i];
      }
      console.log('Finished refreshing cache results for all sources.');
    },
    setCachedStateForOne: (state, result: Payload<CacheData>) => {
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

// let's transform these results into explicit Left|Right convention
function isError(
  value: string | { error: string }
): value is { error: string } {
  return (value as { error: string }).error !== undefined;
}

export const dispatchLoadSettings = (): AppThunk => async (dispatch) => {
  const result = await loadSettings();
  console.log('New distnet settings text loaded:\n', result);
  if (isError(result)) {
    dispatch(setSettingsErrorMessage(result.error));
  } else {
    dispatch(setSettingsState(result));
  }
};

function isNull(text: string | null): text is null {
  return (text as null) === null;
}

export const dispatchSaveSettings = (): AppThunk => async (
  dispatch,
  getState
) => {
  if (isNull(getState().distnet.settingsText)) {
    dispatch(
      setSettingsSaveErrorMessage(
        "Sorry, but I won't save an empty config file."
      )
    );
  } else if (getState().distnet.settingsText === '') {
    dispatch(
      setSettingsSaveErrorMessage(
        "Sorry, but I won't save an empty config file."
      )
    );
  } else {
    const result = await saveSettingsToFile(getState().distnet.settingsText);
    if (result && result.error) {
      dispatch(setSettingsSaveErrorMessage(result.error));
    } else {
      dispatch(setSettingsState(getState().distnet.settingsText));
      dispatch(setSettingsSaveErrorMessage(null));
    }
  }
};

function removeNulls<T>(array: Array<T | null>): Array<T> {
  // Lodash _.filter failed me with a Typescript error.
  const result: Array<T> = [];
  for (let i = 0; i < array.length; i += 1) {
    const value = array[i];
    if (value !== null) {
      result.push(value);
    }
  }
  return result;
}

export const dispatchCacheForAll = (): AppThunk => async (
  dispatch,
  getState
) => {
  const allCaches: Array<CacheData | null> = await reloadAllSourcesIntoCache(
    getState
  );
  const result: Array<CacheData> = removeNulls(allCaches);
  return dispatch(setCachedStateForAll(result));
};

export const dispatchCacheForId = (sourceId: string): AppThunk => async (
  dispatch,
  getState
) => {
  const result: CacheData | null = await reloadOneSourceIntoCache(
    sourceId,
    getState
  );
  if (result) {
    return dispatch(setCachedStateForOne(result));
  }
  console.log(
    `Failed to load source ${sourceId} into cache because it was not found in sources.`
  );
  return dispatch(() => {});
};

export default distnetSlice.reducer;
