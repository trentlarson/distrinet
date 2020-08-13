import { createSlice } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import { RootState } from '../../store';

interface Payload<T> {
  type: string;
  payload: T;
}

const genealogySlice = createSlice({
  name: 'genealogy',
  initialState: { rootUri: '' },
  reducers: {
    setRootUri: (state, contents: Payload<string>) => {
      state.rootUri = contents.payload;
    },
  },
});

export const { setRootUri } = genealogySlice.actions;

export default genealogySlice.reducer;

export const selectRootUri = (state: RootState) => state.genealogy.rootUri;
