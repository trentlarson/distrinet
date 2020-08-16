import * as MapperModule from '../../../app/features/genealogy/samePerson';
import * as uriTools from '../../../app/features/genealogy/js/uriTools';

describe('uriTools', () => {
  it('should match FamilySearch URIs', () => {
    expect(
      uriTools.equal(
        'https://api.familysearch.org/platform/tree/persons/KWHH-HSW',
        'https://api.familysearch.org/platform/tree/persons/KWHH-HSW'
      )
    ).toBe(true);
    expect(
      uriTools.equal(
        'https://api.familysearch.org/platform/tree/persons/KWHH-HSW',
        'https://api.familysearch.org/platform/tree/persons/KWHH-HSW#KWHH-HSW'
      )
    ).toBe(true);
    expect(
      uriTools.equal(
        'https://api.familysearch.org/platform/tree/persons/KWHH-HSW#KWHH-HSW',
        'https://api.familysearch.org/platform/tree/persons/KWHH-HSW'
      )
    ).toBe(true);
    expect(
      uriTools.equal(
        'https://api.familysearch.org/platform/tree/persons/KWHH-A',
        'https://api.familysearch.org/platform/tree/persons/KWHH-B'
      )
    ).toBe(false);
    expect(
      uriTools.equal(
        'https://api.familysearch.org/platform/tree/persons/KWHH-A',
        'https://api.familysearch.org/platform/tree/persons/KWHH-A#B'
      )
    ).toBe(false);
  });
});

describe('MapperModule', () => {
  it('should handle empties', () => {
    expect(MapperModule.default.combineAllIdentities([], {})).toEqual([]);
    expect(
      // eslint-disable-next-line prettier/prettier
      MapperModule.default.combineAllIdentities([], { a: ['1', '2', '3'], b: ['2', '3', '4'] })
    ).toEqual([]);
  });
  it('should have same IDs', () => {
    let ids = MapperModule.default.combineAllIdentities(['a', 'b'], {});
    expect(ids).toEqual(['a', 'b']);

    ids = MapperModule.default.combineAllIdentities(['a', 'b'], {
      d: ['1', '2', '3'],
      e: ['2', '3', '4'],
    });
    expect(ids).toEqual(['a', 'b']);

    // eslint-disable-next-line prettier/prettier
    ids = MapperModule.default.combineAllIdentities(['a', 'b'], { a: 'b', b: 'a' });
    expect(ids).toEqual(['a', 'b']);
  });
  it('should have additional IDs', () => {
    const ids = MapperModule.default.combineAllIdentities(['a', 'b'], {
      a: ['1', '2', '3'],
      c: ['2', '3', '4'],
    });
    expect(ids).toEqual(['a', 'b', '1', '2', '3']);
  });
  it('should have more additional IDs', () => {
    const ids = MapperModule.default.combineAllIdentities(['c', 'd'], {
      c: ['1', '2', 'e'],
      e: ['10'],
      f: ['20'],
    });
    expect(ids).toEqual(['c', 'd', '1', '2', 'e', '10']);
  });
  it('should have even more additional IDs', () => {
    const ids = MapperModule.default.combineAllIdentities(['g', 'h'], {
      g: ['1', '2', 'i'],
      i: ['10', 'g', 'j'],
      j: ['g', 'i'],
    });
    expect(ids).toEqual(['g', 'h', '1', '2', 'i', '10', 'j']);
  });
});
