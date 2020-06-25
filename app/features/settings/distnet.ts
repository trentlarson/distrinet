import { createSlice } from '@reduxjs/toolkit';
import reloadSettings from './settingsSlice';
import reloadSourceIntoCache from './cacheSlice';

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
  payload: CacheData;
}

const distnetSlice = createSlice({
  name: 'distnet',
  initialState: { settings: {}, cache: {} } as DistnetState,
  reducers: {
    setSettingsState: (state: RootState, contents: SettingsPayload) => {
      console.log('New distnet settings:', contents.payload);
      state.settings = contents.payload;
    },
    setCachedState: (state: RootState, result: CachePayload) => {
      const { sourceId, localFile } = result.payload;
      console.log('New cached local file for', sourceId);
      state.cache[sourceId] = { localFile, date: new Date().toISOString() };
    },
  },
});

export const { setCachedState, setSettingsState } = distnetSlice.actions;
export const selectSettings = (state: RootState) => state.distnet.settings;

export const dispatchSettings = (): AppThunk => async (dispatch) => {
  const result: string = await reloadSettings();
  return dispatch(setSettingsState(result));
};

export const dispatchCache = (sourceId: string): AppThunk => async (
  dispatch,
  getState
) => {
  const result: CacheResult = await reloadSourceIntoCache(sourceId, getState);
  return dispatch(setCachedState(result));
};

export default distnetSlice.reducer;
