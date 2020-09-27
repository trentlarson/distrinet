import path from 'path';
import * as R from 'ramda';

import {
  FileTree,
  isSearchable,
  traverseFileTree,
} from '../../../app/features/histories/historiesSlice';

const inputTree1: FileTree = {
  fileBranches: {},
  fullPath: path.parse('/Users/jonathan/my-project/stuff.txt'),
  hasMatch: false,
  isDir: false,
  isFile: true,
  showTree: false,
};

const outputTree1 = R.clone(inputTree1);
outputTree1.hasMatch = true;

const inputTree2: FileTree = {
  fileBranches: { stuff: inputTree1 },
  fullPath: path.parse('/Users/jonathan/my-project'),
  hasMatch: false,
  isDir: false,
  isFile: true,
  showTree: false,
};
inputTree2.fileBranches['stuff.txt'] = inputTree1;

const outputTree2 = R.clone(inputTree2);
outputTree2.hasMatch = true;
outputTree2.fileBranches['stuff.txt'].hasMatch = true;

describe('traverse', () => {
  it('should set', () => {
    expect(
      traverseFileTree(R.set(R.lensProp('hasMatch'), true))(inputTree1)
    ).toEqual(outputTree1);
    expect(
      traverseFileTree(R.set(R.lensProp('hasMatch'), true))(inputTree2)
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
