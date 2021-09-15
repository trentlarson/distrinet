import { createSlice } from '@reduxjs/toolkit';
import fs, { promises as fsPromises } from 'fs';
import path, { ParsedPath } from 'path';
import * as R from 'ramda';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';

// imports in this app
// eslint-disable-next-line import/no-cycle
import { AppThunk } from '../../store';

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
  pathFromUri: ParsedPath;
  hasMatch: boolean; // mark for file and containing directories
  // Beware: it could be a non-dir/non-file.
  // See https://nodejs.org/dist/latest-v12.x/docs/api/fs.html#fs_class_fs_dirent
  isDir: boolean;
  isFile: boolean;
  showTree: boolean; // only makes sense on a dir
}

export interface FileMatch {
  uri: string; // Source ID
  pathFromUri: Array<FileTree>;
}

export interface Display {
  /**
   * keys are URIs of source IDs
   * null values can happen when it's a non-dir/non-file or on an error
   */
  uriTree: Record<string, FileTree>;
  searchProgress: SearchProgress;
}

/**
 * The FileTree underneath 'tree' that matches 'remainingPath'.
 * A null value is an error case that should never happen.
 */
/** This isn't as useful as expected. If we revive, see tests.
export function retrieveFileTreeForPath(
  tree: FileTree,
  remainingPath: ParsedPath
): FileTree | null {
  if (!tree || !remainingPath) {
    return null;
  }
  if (remainingPath.dir === '') {
    if (remainingPath.base === tree.pathFromUri.base) {
      return tree;
    }
    if (tree.fileBranches[remainingPath.base]) {
      return tree.fileBranches[remainingPath.base];
    }
    return null;
  }
  // there's more to search
  const [nextInPath, ...remainingPathParts] = R.split(
    path.sep,
    remainingPath.dir
  );
  const remainingPathAndFileParts = R.concat(remainingPathParts, [
    remainingPath.base,
  ]);
  return retrieveFileTreeForPath(
    tree.fileBranches[nextInPath],
    path.parse(R.join(path.sep, remainingPathAndFileParts))
  );
}
* */

const blankState = {
  uriTree: {} as Record<string, FileTree>,
  searchProgress: { done: 0, total: 0 } as SearchProgress,
} as Display;

const historiesSlice = createSlice({
  name: 'histories',
  initialState: blankState,
  reducers: {
    resetState: (state) => {
      // Gross. What is the built-in way to reset the whole state?
      state.uriTree = blankState.uriTree;
      state.searchProgress = blankState.searchProgress;
    },
    setFileTree: (state, contents: Payload<Record<string, FileTree>>) => {
      state.uriTree = contents.payload;
    },
    markMatchInPath: (state, uriAndMatch: Payload<FileMatch>) => {
      try {
        let nextTree = state.uriTree[uriAndMatch.payload.uri];
        nextTree.hasMatch = true;
        // first one is always the URI, so drop it
        let remainingTrees = R.drop(1, uriAndMatch.payload.pathFromUri);
        while (remainingTrees.length > 0) {
          nextTree = nextTree.fileBranches[remainingTrees[0].fullPath.base];
          nextTree.hasMatch = true;
          remainingTrees = R.drop(1, remainingTrees);
        }
      } catch (e) {
        // todo id:log-errors
        console.error(
          'Failed to mark match for',
          uriAndMatch.payload,
          'because',
          e
        );
      }
    },
    markToggleShowNextLevel: (state, uriContents: Payload<Array<string>>) => {
      let remainingTrees = uriContents.payload;
      let nextTree: FileTree = state.uriTree[remainingTrees[0]];
      remainingTrees = R.drop(1, remainingTrees);
      while (remainingTrees.length > 0) {
        nextTree = nextTree.fileBranches[remainingTrees[0]];
        remainingTrees = R.drop(1, remainingTrees);
      }
      if (nextTree) {
        nextTree.showTree = !nextTree.showTree;
      } else {
        // see task id:log-errors
        console.error(
          'Unable to toggle showing next level for',
          uriContents.payload,
          'because it was not found in the top-level URIs.  Weird!'
        );
      }
    },
    setSearchTotalCount: (state, count: Payload<number>) => {
      state.searchProgress.total = count.payload;
    },
    setSearchProgressCount: (state, count: Payload<number>) => {
      state.searchProgress.done = count.payload;
    },
    incrementSearchTotalBy: (state, contents: Payload<number>) => {
      state.searchProgress.total += contents.payload;
    },
    incrementSearchDone: (state) => {
      state.searchProgress.done += 1;
    },
  },
});

export const {
  resetState,
  setFileTree,
  markMatchInPath,
  markToggleShowNextLevel,
  setSearchProgressCount,
  setSearchTotalCount,
  incrementSearchTotalBy,
  incrementSearchDone,
} = historiesSlice.actions;

export default historiesSlice.reducer;

/**
 * Run the function to modify each node and on its children and return the new node.
 */
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
  // Why does R.map(noMatchifyFun, getState().histories.uriTree) no longer typecheck?
  const treeKeys = R.keys(getState().histories.uriTree);
  const treeVals = R.map(noMatchifyFun, R.values(getState().histories.uriTree));
  const newTree = R.zipObj(treeKeys, treeVals);
  dispatch(setFileTree(newTree));
};

/**
 * Return the whole file tree for the given path
 */
const loadFileOrDir = (
  fullPathStr: string,
  pathFromUriStr: string
): Promise<FileTree> => {
  const fileTreeTemplate: FileTree = {
    fileBranches: {},
    fullPath: path.parse(fullPathStr),
    pathFromUri: path.parse(pathFromUriStr),
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
              loadFileOrDir(
                path.join(fullPathStr, name),
                path.join(pathFromUriStr, name)
              )
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
      console.error(`Got error deriving FileTree for ${fullPathStr}`, err);
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
      (s) => !!s.id && s.id.startsWith('histories:'),
      getState().distnet.settings.sources
    );
    const uriAndTreePromises: Array<Promise<UriAndTree | null>> = historySources.map(
      (source) => {
        if (new URL(source.workUrl).protocol === 'file:') {
          return loadFileOrDir(fileURLToPath(source.workUrl), '').then(
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

export const dispatchToggleShowDir = (
  filePath: Array<string>
): AppThunk => async (dispatch) => {
  dispatch(markToggleShowNextLevel(filePath));
};

const FILE_EXTENSIONS_FOR_SEARCH = [
  '.doc',
  '.docx',
  '.htm',
  '.html',
  '.json',
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
  (rexpStr) => new RegExp(rexpStr, 'i'),
  FILE_REGEXP_STRINGS_FOR_SEARCH
);

const EXTENSION_TESTER = R.anyPass(
  R.map((regexp) => (str: string) => regexp.test(str), FILE_REGEXPS_FOR_SEARCH)
);

export function isSearchable(file: FileTree): boolean {
  return !!file.isFile && EXTENSION_TESTER(path.format(file.fullPath));
}

const searchFile = (
  uri: string,
  pathBefore: Array<FileTree>,
  file: FileTree,
  term: string,
  // This is a ThunkDispatch but I can't figure out how to declare it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: any
): void => {
  if (!file.isFile) {
    // see task id:log-error
    throw Error(
      `Trying to search non-file ${path.format(file.fullPath)} from URI ${uri}`
    );
  }

  const pathStr = path.format(file.fullPath);
  const termRegex = new RegExp(term, 'i');
  const readStream = fs.createReadStream(pathStr, {
    emitClose: true,
    encoding: 'utf8',
  });
  let prevChunk = '';
  readStream
    // eslint-disable-next-line func-names
    .on('data', function (this: Readable, chunk: string) {
      // adding pieces of chunks just in case the word crosses chunk boundaries
      const bothChunks = prevChunk + chunk;
      if (termRegex.test(bothChunks)) {
        dispatch(
          markMatchInPath({
            uri,
            pathFromUri: R.concat(pathBefore, [file]),
          })
        );
        this.destroy();
      } else {
        // take enough of the previous chunk just in case it has some piece of the search term
        prevChunk = R.takeLast(term.length, chunk);
      }
    })
    .on('error', (err) => {
      // see task id:log-error
      console.error(
        'While searching file',
        path.format(file.fullPath),
        'got error',
        err
      );
    })
    .on('close', () => {
      dispatch(incrementSearchDone());
    });
};

const searchFileOrDir = (
  uri: string,
  pathBefore: Array<FileTree>,
  tree: FileTree,
  term: string,
  // This is a ThunkDispatch but I can't figure out how to declare it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: any
): void => {
  if (isSearchable(tree)) {
    searchFile(uri, pathBefore, tree, term, dispatch);
  }
  R.forEach((file: FileTree) => {
    searchFileOrDir(uri, R.concat(pathBefore, [tree]), file, term, dispatch);
  }, R.values(tree.fileBranches));
};

export const countSearchableFiles = (tree: FileTree): number => {
  let count = 0;
  if (isSearchable(tree)) {
    count += 1;
  }
  if (R.values(tree.fileBranches).length > 0) {
    const searchableChildren = R.values(tree.fileBranches).map(
      countSearchableFiles
    );
    count += R.reduce(R.add, 0, searchableChildren);
  }
  return count;
};

export const dispatchCountSearchable = (): AppThunk => async (
  dispatch,
  getState
) => {
  dispatch(setSearchTotalCount(0));
  const fullCount = R.reduce(
    R.add,
    0,
    R.values(getState().histories.uriTree).map(countSearchableFiles)
  );
  dispatch(setSearchTotalCount(fullCount));
};

export const dispatchTextSearch = (term: string): AppThunk => async (
  dispatch,
  getState
) => {
  dispatch(dispatchEraseSearchResults());
  dispatch(setSearchProgressCount(0));
  R.mapObjIndexed((tree: FileTree, uri: string) => {
    searchFileOrDir(uri, [], tree, term, dispatch);
  }, getState().histories.uriTree);
};
