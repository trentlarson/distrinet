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

export interface FileMatch {
  uri: string;
  path: string;
}

export interface Display {
  uriTree: Record<string, FileTree | null>; // keys are URIs from sources
  isSearching: SearchProgress;
}

const historiesSlice = createSlice({
  name: 'histories',
  initialState: { uriTree: {}, isSearching: { done: 0, total: 0 } } as Display,
  reducers: {
    setFileTree: (state, contents: Payload<Record<string, FileTree>>) => {
      state.uriTree = contents.payload;
    },
    markMatchInPath: (state, uriAndMatch: Payload<FileMatch>) => {
      state.uriTree[uriAndMatch.payload.uri]
        .fileBranches[uriAndMatch.payload.path].hasMatch = true;
    },
    markShowNextLevel: (state, uriContents: Payload<string>) => {
      state.uriTree[uriContents.payload].showTree = true;
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
  markMatchInPath,
  markShowNextLevel,
  startSearchProgress,
  incrementSearchTotalBy,
  incrementSearchDone,
} = historiesSlice.actions;

export default historiesSlice.reducer;

export const selectFileTree = (state: RootState) => state.histories.uriTree;

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

export const dispatchEraseSearchResults = (): AppThunk => async (dispatch, getState) => {
  const noMatchifyFun = traverseFileTree(
    R.set(R.lensProp('hasMatch'), false)
  );
  let newTree = R.map(noMatchifyFun, getState().histories.uriTree);
  dispatch(setFileTree(newTree));
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
};

function markMatchInTree(uriTree: Record<string, FileTree>, filePath: string) {
  const newResult = R.clone(uriTree);

  R.forEach(
    (key: string) =>
      R.forEach((file: FileTree) => {
        if (path.format(file.fullPath) === path.format(filePath)) {
          file.hasMatch = true;
        }
      },
      newResult[key]),
    R.keys(newResult)
  );
  return newResult;
}

export const dispatchTextSearch = (term: string): AppThunk => async (
  dispatch,
  getState
) => {
  dispatch(dispatchEraseSearchResults());
  dispatch(startSearchProgress());

  R.keys(getState().histories.uriTree).forEach((uri) => {
    const tree = getState().histories.uriTree[uri];
    dispatch(incrementSearchTotalBy(tree.fileBranches.length));
    R.forEach((file: FileTree) => {
      let pathStr = path.format(file.fullPath);
      const readStream = fs.createReadStream(pathStr, 'utf8');
      let prevChunk = '';
      readStream
        // eslint-disable-next-line func-names
        .on('data', function (this: Readable, chunk) {
          // adding pieces of chunks just in case the word crosses chunk boundaries
          const bothChunks = prevChunk + chunk;
          if (bothChunks.indexOf(term) > -1) {
            dispatch(markMatchInPath({ uri: uri, path: file.fullPath.base }));
            this.destroy();
          } else {
            // take enough of the previous chunk just in case it has some piece of the search term
            prevChunk = R.takeLast(term.length, chunk);
          }
        })
        .on('close', () => {
          dispatch(incrementSearchDone());
        });
    },
    R.filter((tree) => tree.isFile, R.values(tree.fileBranches)));
  });
};
