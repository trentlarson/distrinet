import { createSlice } from '@reduxjs/toolkit';
import reloadSettings from './settingsSlice';

interface DistnetState {
  settings: Sources;
  cache: Cache;
}

const distnetSlice = createSlice({
  name: 'distnet',
  initialState: { settings: {}, cache: {} } as DistnetState,
  reducers: {
    setSettingsState: (state: RootState, contents: SettingsContents) => {
      console.log('New distnet settings:', contents.payload);
      state.settings = contents.payload;
    },
  },
});

export const { setSettingsState } = distnetSlice.actions;
export const selectSettings = (state: RootState) => state.distnet.settings;

export const dispatchSettings = (): AppThunk => async (dispatch) => {
  const result = await reloadSettings();
  return dispatch(setSettingsState(result));
};

export default distnetSlice.reducer;
