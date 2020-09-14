import { createSlice } from '@reduxjs/toolkit';
import { promises as fsPromises } from 'fs';
import * as R from 'ramda';
import { fileURLToPath } from 'url';
// eslint-disable-next-line import/no-cycle
import { AppThunk, RootState } from '../../store';

interface Payload<T> {
  type: string;
  payload: T;
}

export interface FileInfo {
  name: string;
  isDir: boolean;
  isFile: boolean;
}

export interface Display {
  display: Record<string, Array<FileInfo>>;
}

const historiesSlice = createSlice({
  name: 'histories',
  initialState: { display: {} } as Display,
  reducers: {
    setDisplay: (state, contents: Payload<Record<string, Array<FileInfo>>>) => {
      state.display = contents.payload;
    },
  },
});

export const { setDisplay } = historiesSlice.actions;

export default historiesSlice.reducer;

export const selectDisplay = (state: RootState) => state.histories.display;

export const dispatchLoadDir = (historyUri: string): AppThunk => async (
  dispatch,
  getState
) => {
  const source = R.find(
    (s) => s.id === historyUri,
    getState().distnet.settings.sources
  );
  const urlString =
    source && source.urls && source.urls[0] && source.urls[0].url;
  if (urlString && new URL(urlString).protocol === 'file:') {
    const filePath = fileURLToPath(urlString);
    fsPromises
      .stat(filePath)
      .then((stats) => {
        if (stats.isDirectory()) {
          return fsPromises.readdir(filePath, { withFileTypes: true });
        }
        return [];
      })
      .then((fileArray) => {
        const allFiles = fileArray.map((file) => ({
          name: file.name,
          isDir: file.isDirectory(),
          isFile: file.isFile(),
        }));
        const display = R.clone(getState().histories.display);
        display[historyUri] = allFiles;
        return dispatch(setDisplay(display));
      })
      .catch((err) => {
        console.error(`Got error accessing file/directory ${urlString}`, err);
      });
  } else {
    console.log('Not doing anything about histories URL', historyUri);
  }
};
