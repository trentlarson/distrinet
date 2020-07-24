import { createSlice } from '@reduxjs/toolkit';
import _ from 'lodash';
import yaml from 'js-yaml';

// eslint-disable-next-line import/no-cycle
import { AppThunk } from '../../store';
import { CacheData, DistnetState, Payload } from './distnetClasses';
import { loadSettings, saveSettingsToFile } from './settings';
import {
  createCacheDir,
  reloadAllSourcesIntoCache,
  reloadOneSourceIntoCache,
} from './cache';

const distnetSlice = createSlice({
  name: 'distnet',
  initialState: {
    settings: { sources: [], resourceTypes: {} },
    settingsErrorMessage: null,
    settingsText: null,
    settingsSaveErrorMessage: null,
    cache: {},
    cacheErrorMessage: null,
  } as DistnetState,
  reducers: {
    setSettingsStateText: (state, contents: Payload<string>) => {
      state.settingsText = contents.payload;
    },
    setSettingsStateObject: (state, contents) => {
      state.settings = contents.payload;
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
    setCacheErrorMessage: (state, result: Payload<string>) => {
      state.cacheErrorMessage = result.payload;
    },
  },
});

export const {
  setCachedStateForAll,
  setCachedStateForOne,
  setCacheErrorMessage,
  setSettingsErrorMessage,
  setSettingsSaveErrorMessage,
  setSettingsStateObject,
  setSettingsStateText,
} = distnetSlice.actions;

export const dispatchSaveSettingsTextAndYaml = (contents: string): AppThunk => (
  dispatch
) => {
  dispatch(setSettingsStateText(contents));
  try {
    const loaded = yaml.safeLoad(contents);
    dispatch(setSettingsStateObject(loaded));
    console.log('New distnet settings object:\n', loaded);
    // do some basic sanity checks
    loaded.sources.forEach((s, index) => {
      if (!s || !s.id) {
        throw Error(`Source #${index} or its ID is null or undefined.`);
      } else if (!s.url && (!s.urls || s.urls.length === 0)) {
        throw Error(`Source #${index} has no URL.`);
      }
    });
    dispatch(setSettingsErrorMessage(null));
  } catch (error) {
    // probably a YAMLException https://github.com/nodeca/js-yaml/blob/master/lib/js-yaml/exception.js
    console.log(
      'New distnet settings failed YAML parse or sanity check:\n',
      error.message
    );
    dispatch(setSettingsErrorMessage(error.message));
  }
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
    dispatch(dispatchSaveSettingsTextAndYaml(result));
  }
};

export const dispatchSaveSettings = (): AppThunk => async (
  dispatch,
  getState
) => {
  const { settingsText } = getState().distnet;
  if (_.isNil(settingsText)) {
    dispatch(
      setSettingsSaveErrorMessage(
        "Sorry, but I won't save an empty config file."
      )
    );
  } else if (settingsText === '') {
    dispatch(
      setSettingsSaveErrorMessage(
        "Sorry, but I won't save an empty config file."
      )
    );
  } else {
    // settingsText is a non-empty string
    const result = await saveSettingsToFile(settingsText);
    if (result && result.error) {
      dispatch(setSettingsSaveErrorMessage(result.error));
    } else {
      dispatch(dispatchSaveSettingsTextAndYaml(settingsText));
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
  await createCacheDir().catch((error) => {
    dispatch(setCacheErrorMessage(error.toString()));
  });
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
  await createCacheDir().catch((error) => {
    dispatch(setCacheErrorMessage(error.toString()));
  });
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
