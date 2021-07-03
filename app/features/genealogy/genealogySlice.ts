import { createSlice } from '@reduxjs/toolkit';

// imports in this app
// eslint-disable-next-line import/no-cycle
import { RootState } from '../../store';

interface Payload<T> {
  type: string;
  payload: T;
}

const genealogySlice = createSlice({
  name: 'genealogy',
  initialState: {
    correlatedIdsRefreshedMillis: 0,
    fsSessionId: '',
    rootUri: '',
  },
  reducers: {
    setCorrelatedIdsRefreshedMillis: (state, contents: Payload<number>) => {
      state.correlatedIdsRefreshedMillis = contents.payload;
    },
    setFsSessionId: (state, contents: Payload<string>) => {
      state.fsSessionId = contents.payload;
    },
    setRootUri: (state, contents: Payload<string>) => {
      state.rootUri = contents.payload;
    },
  },
});

export const {
  setCorrelatedIdsRefreshedMillis,
  setFsSessionId,
  setRootUri,
} = genealogySlice.actions;

export default genealogySlice.reducer;

export const selectFsSessionId = (state: RootState) =>
  state.genealogy.fsSessionId;
export const selectCorrelatedIdsRefreshedMillis = (state: RootState) =>
  state.genealogy.correlatedIdsRefreshedMillis;
export const selectRootUri = (state: RootState) => state.genealogy.rootUri;
