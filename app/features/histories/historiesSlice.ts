import { createSlice } from '@reduxjs/toolkit';
import fs, { promises as fsPromises } from 'fs';
import path, { Path } from 'path';
import * as R from 'ramda';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
// eslint-disable-next-line import/no-cycle
import { AppThunk, RootState } from '../../store';

interface Payload<T> {
  type: string;
  payload: T;
}

export interface SearchProgress {
  done: number;
  total: number;
}

export interface FileTree {
  fileBranches: Record<string, FileTree>; // directory contents; keys are file/dir names (ie. path.base)
  fullPath: Path;
  hasMatch: boolean;
  // Beware: it could be a non-dir/non-file.
  // See https://nodejs.org/dist/latest-v12.x/docs/api/fs.html#fs_class_fs_dirent
  isDir: boolean;
  isFile: boolean;
  showTree: boolean;
}

export interface Display {
  uriTree: Record<string, FileTree | null>; // keys are URIs from sources
  isSearching: SearchProgress;
}

export const traverseFileTree = (someFun: (FileTree) => FileTree) => (
  tree: FileTree
): FileTree => {
  const result = someFun(tree);
  const resultFileBranchValues = R.map(
    traverseFileTree(someFun),
    R.values(result.fileBranches)
  );
  const resultFileBranches = R.zipObj(
    R.keys(result.fileBranches),
    resultFileBranchValues
  );
  result.fileBranches = resultFileBranches;
  return result;
};

const historiesSlice = createSlice({
  name: 'histories',
  initialState: { uriTree: {}, isSearching: { done: 0, total: 0 } } as Display,
  reducers: {
    setFileTree: (state, contents: Payload<Record<string, FileTree>>) => {
      state.uriTree = contents.payload;
    },
    eraseSearchResults: (state) => {
      const newTree = traverseFileTree(
        R.set(R.lensProp('hasMatch'), 'false'),
        state.uriTree
      );
      state.uriTree = newTree;
    },
    markShowNextLevel: (state, uriContents: Payload<string>) => {
      state.uriTree[uriContents.payload].showTree = true;
    },
    markMatch: (state, contents: Payload<Path>) => {
      const filePath = contents.payload;
      const newResult = R.clone(state.uriTree);

      // needs rewriting for recursing

      R.forEach(
        (key: string) =>
          R.forEach((file: FileTree) => {
            if (path.format(file.path) === path.format(filePath)) {
              file.hasMatch = true;
            }
          }, newResult[key]),
        R.keys(newResult)
      );
      state.uriTree = newResult;
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
  setFileTree,
  eraseSearchResults,
  markMatch,
  markShowNextLevel,
  startSearchProgress,
  incrementSearchTotalBy,
  incrementSearchDone,
} = historiesSlice.actions;

export default historiesSlice.reducer;

export const selectFileTree = (state: RootState) => state.histories.uriTree;

export const dispatchEraseSearchResults = (): AppThunk => async (dispatch) => {
  dispatch(eraseSearchResults());
};

/**
 * Return the whole file tree for the given path
 */
const loadDir = (fullPathStr: string): Promise<FileTree> => {
  return fsPromises
    .stat(fullPathStr)
    .then((stats) => {
      if (stats.isDirectory()) {
        return fsPromises.readdir(fullPathStr, { withFileTypes: true });
      }
      if (stats.isFile()) {
        // this only happens if the initial URI is a file (which would be weird)
        return fullPathStr;
      }
      console.error('Got non-file/non-dir', fullPathStr);
      return null;
    })
    .then((fileArray) => {
      // fileArray is typically an Array<fs.Dirent> but may be a string (file name)
      if (Array.isArray(fileArray)) {
        const allFiles = fileArray.map(
          (file) =>
            ({
              fullPath: path.parse(path.join(fullPathStr, file.name)),
              isDir: file.isDirectory(),
              isFile: file.isFile(),
              hasMatch: false,
              fileBranches: {},
              showTree: false,
            } as FileTree)
        );

        const recursivePromises: Array<Promise<FileTree>> = allFiles.map(
          (fileTree) =>
            fileTree.isDir // eslint-disable-next-line promise/no-nesting
              ? loadDir(path.format(fileTree.fullPath)).then((tree) => ({
                  fileBranches: tree,
                  ...fileTree,
                }))
              : Promise.resolve(fileTree)
        );

        return Promise.all(recursivePromises);
      }
      if (fileArray === fullPathStr) {
        // it's the file name (again, this would be weird)
        return fullPathStr;
      }
      return null;
    })
    .then((allSubEntries) => {
      const result = {
        fullPath: path.parse(fullPathStr),
        isDir: Array.isArray(allSubEntries),
        isFile: allSubEntries === fullPathStr,
        hasMatch: false,
        fileBranches: {},
      };
      if (Array.isArray(allSubEntries)) {
        allSubEntries.forEach((entry) => {
          result.fileBranches[entry.fullPath.base] = entry;
        });
      }
      return result;
    })
    .catch((err) => {
      console.error(`Got error accessing file/directory ${fullPathStr}`, err);
    });
};

export const dispatchLoadHistoryDirsIfEmpty = (): AppThunk => async (
  dispatch,
  getState
) => {
  if (R.isEmpty(getState().histories.uriTree)) {
    const historySources = R.filter(
      (s) => s.id.startsWith('histories:'),
      getState().distnet.settings.sources
    );
    const uriAndTreePromises = historySources.map((source) => {
      if (
        source.urls &&
        source.urls[0] &&
        source.urls[0].url &&
        new URL(source.urls[0].url).protocol === 'file:'
      ) {
        return loadDir(fileURLToPath(source.urls[0].url)).then((fileTree) => {
          return { uri: source.id, tree: fileTree };
        });
      }
      return Promise.resolve(null);
    });
    const uriTrees = await Promise.all(uriAndTreePromises);
    const uriTree = R.zipObj(
      // historySources.map((s) => s.id),
      uriTrees.map(R.prop('uri')),
      uriTrees.map(R.prop('tree'))
    );
    if (!R.isEmpty(uriTree)) {
      dispatch(setFileTree(uriTree));
    }
  }
};

export const dispatchShowDir = (historyUri: string): AppThunk => async (
  dispatch
) => {
  dispatch(markShowNextLevel(historyUri));
  /**
  const source = R.find(
    (s) => s.id === historyUri,
    getState().distnet.settings.sources
  );
  const urlString =
    source && source.urls && source.urls[0] && source.urls[0].url;
  if (urlString && new URL(urlString).protocol === 'file:') {
    const allFiles = await loadDir(fileURLToPath(urlString));
    const uriTree = R.clone(getState().histories.uriTree);
    uriTree[historyUri] = allFiles;
    return dispatch(setFileTree(uriTree));
  }
  console.log('Not doing anything about histories URL', historyUri);
  return null;
* */
};

export const dispatchTextSearch = (term: string): AppThunk => async (
  dispatch,
  getState
) => {
  dispatch(eraseSearchResults());
  dispatch(startSearchProgress());

  R.keys(getState().histories.uriTree).forEach((uri) => {
    const files = getState().histories.uriTree[uri];
    dispatch(incrementSearchTotalBy(files.length));
    files.forEach((file: FileTree) => {
      const readStream = fs.createReadStream(path.format(file.path), 'utf8');
      let prevChunk = '';
      readStream
        // eslint-disable-next-line func-names
        .on('data', function (this: Readable, chunk) {
          // adding pieces of chunks just in case the word crosses chunk boundaries
          const bothChunks = prevChunk + chunk;
          if (bothChunks.indexOf(term) > -1) {
            dispatch(markMatch(file.path));
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
