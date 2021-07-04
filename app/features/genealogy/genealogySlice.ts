import { createSlice } from '@reduxjs/toolkit';

// imports in this app
// eslint-disable-next-line import/no-cycle
import { RootState } from '../../store';
import { dispatchReloadCacheForId } from '../distnet/distnetSlice';
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

export const refreshIdMapperForDispatch = (): AppThunk => async(
  dispatch,
  getState
) => {
  if (getState().genealogy.cache) {
    MapperBetweenSets.refreshIfNewer(
      getState().genealogy.correlatedIdsRefreshedMillis,
      getState().genealogy.cache,
      (millis) => dispatch(setCorrelatedIdsRefreshedMillis(millis))
    );
  }
}

export const updateCachesForDispatch = (sourceId: string): AppThunk => async (
  dispatch,
  getState
): void => {
  // Two caches... let's hope we never have any more!
  dispatch(dispatchReloadCacheForId(sourceId)).then(() => {
    const cache = getState().distnet.cache;
    MapperBetweenSets.forceOneRefresh(
      cache,
      sourceId,
      getState().genealogy.correlatedIdsRefreshedMillis,
      (millis) => dispatch(setCorrelatedIdsRefreshedMillis(millis))
    );
  });
}
