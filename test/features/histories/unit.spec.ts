import path from 'path';
import * as R from 'ramda';

import {
  FileTree,
  isSearchable,
  traverseFileTree,
} from '../../../app/features/histories/historiesSlice';

const inputTree1111: FileTree = {
  fileBranches: {},
  fullPath: path.parse('/Users/jonathan/my-project/stuff.txt'),
  pathFromUri: path.parse('jonathan/my-project/stuff.txt'),
  hasMatch: false,
  isDir: false,
  isFile: true,
  showTree: false,
};

const outputTree1 = R.clone(inputTree1111);
outputTree1.hasMatch = true;

const inputTree111Dir: FileTree = {
  fileBranches: { 'stuff.txt': inputTree1111 },
  fullPath: path.parse('/Users/jonathan/my-project'),
  pathFromUri: path.parse('jonathan/my-project'),
  hasMatch: false,
  isDir: false,
  isFile: true,
  showTree: false,
};

const inputTree11Dir: FileTree = {
  fileBranches: { 'my-project': inputTree111Dir },
  fullPath: path.parse('/Users/jonathan'),
  pathFromUri: path.parse('jonathan'),
  hasMatch: false,
  isDir: false,
  isFile: true,
  showTree: false,
};

const outputTree2 = R.clone(inputTree111Dir);
outputTree2.hasMatch = true;
outputTree2.fileBranches['stuff.txt'].hasMatch = true;

describe('traverse', () => {
  it('should set', () => {
    expect(
      traverseFileTree(R.set(R.lensProp('hasMatch'), true))(inputTree1111)
    ).toEqual(outputTree1);
    expect(
      traverseFileTree(R.set(R.lensProp('hasMatch'), true))(inputTree111Dir)
    ).toEqual(outputTree2);
  });
});

function isSearchableFile(name) {
  return isSearchable({ fullPath: path.parse(name), isFile: true });
}

describe('searchable', () => {
  it('should match', () => {
    expect(isSearchableFile('junk.abc.txt')).toBe(true);
    expect(isSearchableFile('junk.txt')).toBe(true);
    expect(isSearchableFile('junk.md')).toBe(true);
    expect(isSearchableFile('junk.odt')).toBe(true);
    expect(isSearchableFile('junk.xml')).toBe(true);
  });
  it('should not match', () => {
    expect(isSearchableFile('junk')).toBe(false);
    expect(isSearchableFile('junktxt')).toBe(false);
    expect(isSearchableFile('junk.tx')).toBe(false);
    expect(isSearchableFile('junk.mdx')).toBe(false);
  });
});

/**
const inputTree1111Matched = R.clone(inputTree1111);
const inputTree111DirMatched = R.clone(inputTree111Dir);
inputTree111DirMatched.fileBranches['stuff.txt'] = inputTree1111Matched;
const inputTree11DirMatched = R.clone(inputTree111DirMatched);
inputTree11DirMatched.fileBranches['my-project'] = inputTree111DirMatched;

describe('retrieve trees', () => {
  it('should match', () => {
    expect(retrieveFileTreeForPath(inputTree11Dir, path.parse('my-project/stuff.txt')))
      .toContain([inputTree11DirMatched, inputTree111DirMatched, inputTree1111Matched]);
  });
});
**/
