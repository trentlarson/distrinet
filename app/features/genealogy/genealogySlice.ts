import { createSlice } from '@reduxjs/toolkit';

// imports in this app
// eslint-disable-next-line import/no-cycle
import { AppThunk } from '../../store';
import MapperBetweenSets from './samePerson';

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

// This could take 'dispatch' and 'getState' on the Promise function.
export const resetIdMappings = (): AppThunk => async (): Promise<void> => {
  console.log('Here is the previous text for ID mapping, stored inside the localStorage', MapperBetweenSets.getStorageKey(), 'key:', MapperBetweenSets.getStorage());
  MapperBetweenSets.clear();
  setCorrelatedIdsRefreshedMillis(0);
  console.log('Cleared ID mapping data.');
};

/**
 Refresh all ID mappings for all sources.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const refreshIdMapperForDispatch = (): AppThunk => async (
  dispatch,
  getState
): Promise<void> => {
  MapperBetweenSets.refreshIfNewer(
    getState().genealogy.correlatedIdsRefreshedMillis,
    getState().distnet.cache,
    (millis) => dispatch(setCorrelatedIdsRefreshedMillis(millis))
  );
};

/**
 Update ID mappings for given source.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateIdMapperForDispatch = (sourceId: string): AppThunk => async (
  dispatch,
  getState
): Promise<void> => {
  if (sourceId) {
    const { cache } = getState().distnet;
    MapperBetweenSets.forceOneRefresh(
      cache,
      sourceId,
      getState().genealogy.correlatedIdsRefreshedMillis,
      (millis) => dispatch(setCorrelatedIdsRefreshedMillis(millis))
    );
  }
};
