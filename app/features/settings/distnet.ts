import { createSlice } from '@reduxjs/toolkit';
import reloadSettings from './settingsSlice';
import {
  reloadAllSourcesIntoCache,
  reloadOneSourceIntoCache,
} from './cacheSlice';

interface DistnetState {
  settings: Sources;
  cache: Cache;
}

interface SettingsPayload {
  type: string;
  payload: Sources;
}

interface CachePayload {
  type: string;
  payload: CacheResult;
}

interface AllCachePayload {
  type: string;
  payload: Array<CacheResult>;
}

const distnetSlice = createSlice({
  name: 'distnet',
  initialState: { settings: {}, cache: {} } as DistnetState,
  reducers: {
    setSettingsState: (state: RootState, contents: SettingsPayload) => {
      console.log('New distnet settings:', contents.payload);
      state.settings = contents.payload;
    },
    setCachedStateForAll: (state: RootState, result: AllCachePayload) => {
      const newData: Array<CacheResult> = result.payload;
      console.log('Refreshing from', newData);
      for (let i = 0; i < newData.length; i += 1) {
        const data = newData[i];
        if (data) {
          state.cache[data.sourceId] = {
            localFile: data.localFile,
            date: new Date().toISOString(),
          };
        }
      }
      console.log('Finished refreshing cache results for all sources.');
    },
    setCachedStateForOne: (state: RootState, result: CachePayload) => {
      const { sourceId, localFile } = result.payload;
      state.cache[sourceId] = { localFile, date: new Date().toISOString() };
      console.log('Cached new local file for', sourceId);
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
  const result: Array<CacheResult> = await reloadAllSourcesIntoCache(getState);
  return dispatch(setCachedStateForAll(result));
};

export const dispatchCacheForId = (sourceId: string): AppThunk => async (
  dispatch,
  getState
) => {
  const result: CacheResult = await reloadOneSourceIntoCache(
    sourceId,
    getState
  );
  return dispatch(setCachedStateForOne(result));
};

export default distnetSlice.reducer;
