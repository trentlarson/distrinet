import { createSlice } from '@reduxjs/toolkit';
import fs, { promises as fsPromises } from 'fs';
import path, { ParsedPath } from 'path';
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
  fullPath: ParsedPath;
  hasMatch: boolean; // only makes sense on a file
  // Beware: it could be a non-dir/non-file.
  // See https://nodejs.org/dist/latest-v12.x/docs/api/fs.html#fs_class_fs_dirent
  isDir: boolean;
  isFile: boolean;
  showTree: boolean; // only makes sense on a dir
}

export interface FileMatch {
  uri: string;
  path: string;
}

export interface Display {
  /**
   * keys are URIs from sources
   * null values can happen when it's a non-dir/non-file or on an error
   */
  uriTree: Record<string, FileTree>;
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
      const tree = state.uriTree[uriAndMatch.payload.uri];
      if (tree) {
        tree.fileBranches[uriAndMatch.payload.path].hasMatch = true;
      }
    },
    markToggleShowNextLevel: (state, uriContents: Payload<string>) => {
      const tree = state.uriTree[uriContents.payload];
      if (tree) {
        tree.showTree = !tree.showTree;
      }
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
  markToggleShowNextLevel,
  startSearchProgress,
  incrementSearchTotalBy,
  incrementSearchDone,
} = historiesSlice.actions;

export default historiesSlice.reducer;

export const selectFileTree = (state: RootState) => state.histories.uriTree;

export const traverseFileTree = (someFun: (arg0: FileTree) => FileTree) => (
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

export const dispatchEraseSearchResults = (): AppThunk => async (
  dispatch,
  getState
) => {
  const noMatchifyFun = traverseFileTree(R.set(R.lensProp('hasMatch'), false));
  const newTree = R.map(noMatchifyFun, getState().histories.uriTree);
  dispatch(setFileTree(newTree));
};

/**
 * Return the whole file tree for the given path
 */
const loadFileOrDir = (fullPathStr: string): Promise<FileTree> => {
  const fileTreeTemplate: FileTree = {
    fileBranches: {},
    fullPath: path.parse(fullPathStr),
    hasMatch: false,
    isDir: false,
    isFile: false,
    showTree: false,
  };
  return fsPromises
    .stat(fullPathStr)
    .then((stats) => {
      const result: FileTree = {
        ...fileTreeTemplate,
        isDir: stats.isDirectory(),
        isFile: stats.isFile(),
      };
      if (stats.isDirectory()) {
        // eslint-disable-next-line promise/no-nesting
        return fsPromises
          .readdir(fullPathStr)
          .then((names) => {
            const fileTreePromises = names.map((name) =>
              loadFileOrDir(path.join(fullPathStr, name))
            );
            return Promise.all(fileTreePromises);
          })
          .then((fileTrees) => {
            const names = fileTrees.map((ft) => ft.fullPath.base);
            const branches = R.zipObj(names, fileTrees);
            return {
              ...result,
              fileBranches: branches,
            };
          })
          .catch((err) => {
            throw err;
          });
      }
      return result;
    })
    .catch((err) => {
      console.error(`Got error creating FileTree for ${fullPathStr}`, err);
      return fileTreeTemplate;
    });
};

interface UriAndTree {
  uri: string;
  tree: FileTree;
}

export const dispatchLoadHistoryDirsIfEmpty = (): AppThunk => async (
  dispatch,
  getState
) => {
  if (R.isEmpty(getState().histories.uriTree)) {
    const historySources = R.filter(
      (s) => s.id.startsWith('histories:'),
      getState().distnet.settings.sources
    );
    const uriAndTreePromises: Array<Promise<UriAndTree | null>> = historySources.map(
      (source) => {
        if (
          source.urls &&
          source.urls[0] &&
          source.urls[0].url &&
          new URL(source.urls[0].url).protocol === 'file:'
        ) {
          return loadFileOrDir(fileURLToPath(source.urls[0].url)).then(
            (fileTree) => {
              return { uri: source.id, tree: fileTree };
            }
          );
        }
        return Promise.resolve(null);
      }
    );
    const uriTreeOrNulls: Array<UriAndTree | null> = await Promise.all(
      uriAndTreePromises
    );
    const uriTrees: Array<UriAndTree> = uriTreeOrNulls.filter(
      (x): x is UriAndTree => x !== null
    );
    // That same thing does NOT work with R.filter!  Ug.
    // R.filter((x): x is UriAndTree => x !== null, uriTreeOrNulls);
    const uriTree: Record<string, FileTree> = R.zipObj(
      uriTrees.map(R.prop('uri')),
      uriTrees.map(R.prop('tree'))
    );
    if (!R.isEmpty(uriTree)) {
      dispatch(setFileTree(uriTree));
    }
  }
};

export const dispatchToggleShowDir = (historyUri: string): AppThunk => async (
  dispatch
) => {
  dispatch(markToggleShowNextLevel(historyUri));
};

const FILE_EXTENSIONS_FOR_SEARCH = [
  '.doc',
  '.docx',
  '.htm',
  '.html',
  '.js',
  '.md',
  '.odt',
  '.txt',
  '.xml',
];

const FILE_REGEXP_STRINGS_FOR_SEARCH = R.map(
  (name) => `${name.replace('.', '\\.')}$`,
  FILE_EXTENSIONS_FOR_SEARCH
);

const FILE_REGEXPS_FOR_SEARCH = R.map(
  (rexpStr) => new RegExp(rexpStr),
  FILE_REGEXP_STRINGS_FOR_SEARCH
);

const EXTENSION_TESTER = R.anyPass(
  R.map((regexp) => (str: string) => regexp.test(str), FILE_REGEXPS_FOR_SEARCH)
);

export function isSearchable(file: FileTree): boolean {
  return !!file.isFile && EXTENSION_TESTER(path.format(file.fullPath));
}

const searchFileOrDir = (
  uri: string,
  tree: FileTree,
  term: string,
  // This is a ThunkDispatch but I can't figure out how to declare it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: any
) => {
  R.forEach(
    (file: FileTree) => {
      dispatch(incrementSearchTotalBy(1));
      const pathStr = path.format(file.fullPath);
      const readStream = fs.createReadStream(pathStr, 'utf8');
      let prevChunk = '';
      readStream
        // eslint-disable-next-line func-names
        .on('data', function (this: Readable, chunk) {
          // adding pieces of chunks just in case the word crosses chunk boundaries
          const bothChunks = prevChunk + chunk;
          if (bothChunks.indexOf(term) > -1) {
            dispatch(markMatchInPath({ uri, path: file.fullPath.base }));
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
    R.filter((f) => isSearchable(f), R.values(tree.fileBranches))
  );
  R.forEach(
    (file: FileTree) => {
      searchFileOrDir(uri, file, term, dispatch);
    },
    R.filter((f) => f.isDir, R.values(tree.fileBranches))
  );
};

export const dispatchTextSearch = (term: string): AppThunk => async (
  dispatch,
  getState
) => {
  dispatch(dispatchEraseSearchResults());
  dispatch(startSearchProgress());
  R.mapObjIndexed((tree: FileTree, uri: string) => {
    searchFileOrDir(uri, tree, term, dispatch);
  }, getState().histories.uriTree);
};
