import { createSlice } from '@reduxjs/toolkit';
import fs, { promises as fsPromises } from 'fs';
import path from 'path';
import * as R from 'ramda';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
// eslint-disable-next-line import/no-cycle
import { AppThunk, RootState } from '../../store';

interface Payload<T> {
  type: string;
  payload: T;
}

export interface FileInfo {
  fullPath: string;
  isDir: boolean;
  isFile: boolean;
  hasMatch: boolean;
}

export interface SearchProgress {
  done: number;
  total: number;
}

export interface Display {
  display: Record<string, Array<FileInfo>>;
  isSearching: SearchProgress;
}

const historiesSlice = createSlice({
  name: 'histories',
  initialState: { display: {}, isSearching: { done: 0, total: 0 } } as Display,
  reducers: {
    setDisplay: (state, contents: Payload<Record<string, Array<FileInfo>>>) => {
      state.display = contents.payload;
    },
    eraseSearchResults: (state) => {
      const newResult = R.clone(state.display);
      R.forEach(
        (key: string) =>
          R.forEach((file: FileInfo) => {
            file.hasMatch = false;
          }, newResult[key]),
        R.keys(newResult)
      );
      state.display = newResult;
    },
    markMatch: (state, contents: Payload<string>) => {
      const fullPath = contents.payload;
      const newResult = R.clone(state.display);
      R.forEach(
        (key: string) =>
          R.forEach((file: FileInfo) => {
            if (file.fullPath === fullPath) {
              file.hasMatch = true;
            }
          }, newResult[key]),
        R.keys(newResult)
      );
      state.display = newResult;
    },
    startSearchProgress: (state) => {
      state.isSearching = { done: 0, total: 0 };
    },
    incrementSearchTotalBy: (state, contents: Payload<number>) => {
      state.isSearching.total += contents.payload;
    },
    incrementSearchDone: (state) => {
      state.isSearching.done += 1;
    },
  },
});

export const {
  setDisplay,
  eraseSearchResults,
  markMatch,
  startSearchProgress,
  incrementSearchTotalBy,
  incrementSearchDone,
} = historiesSlice.actions;

export default historiesSlice.reducer;

export const selectDisplay = (state: RootState) => state.histories.display;

export const dispatchEraseSearchResults = (): AppThunk => async (dispatch) => {
  dispatch(eraseSearchResults());
};

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
          fullPath: path.join(filePath, file.name),
          isDir: file.isDirectory(),
          isFile: file.isFile(),
          hasMatch: false,
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

export const dispatchTextSearch = (term: string): AppThunk => async (
  dispatch,
  getState
) => {
  dispatch(eraseSearchResults());
  dispatch(startSearchProgress());
  R.keys(getState().histories.display).forEach((uri) => {
    const files = getState().histories.display[uri];
    dispatch(incrementSearchTotalBy(files.length));
    files.forEach((file: FileInfo) => {
      const readStream = fs.createReadStream(file.fullPath, 'utf8');
      let prevChunk = '';
      readStream
        // disable-eslint-next-line func-names
        .on('data', function (this: Readable, chunk) {
          // adding pieces of chunks just in case the word crosses chunk boundaries
          const bothChunks = prevChunk + chunk;
          if (bothChunks.indexOf(term) > -1) {
            dispatch(markMatch(file.fullPath));
            this.destroy();
          } else {
            // take enough of the previous chunk if it has some piece of the term
            prevChunk = R.takeLast(term.length, chunk);
          }
        })
        .on('close', () => {
          dispatch(incrementSearchDone());
        });
    });
  });
};
