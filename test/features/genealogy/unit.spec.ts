import MapperBetweenSets from '../../../app/features/genealogy/samePerson';

const mapper = MapperBetweenSets;

describe('MapperBetweenSets', () => {
  it('should handle empties', () => {
    expect(mapper.findAllIdentities([], {})).toEqual([]);
    expect(
      mapper.findAllIdentities([], { a: ['1', '2', '3'], b: ['2', '3', '4'] })
    ).toEqual([]);
  });
  it('should have same IDs', () => {
    let ids = mapper.findAllIdentities(['a', 'b'], {});
    expect(ids).toEqual(['a', 'b']);

    ids = mapper.findAllIdentities(['a', 'b'], {
      d: ['1', '2', '3'],
      e: ['2', '3', '4'],
    });
    expect(ids).toEqual(['a', 'b']);

    ids = mapper.findAllIdentities(['a', 'b'], { a: 'b', b: 'a' });
    expect(ids).toEqual(['a', 'b']);
  });
  it('should have additional IDs', () => {
    const ids = mapper.findAllIdentities(['a', 'b'], {
      a: ['1', '2', '3'],
      c: ['2', '3', '4'],
    });
    expect(ids).toEqual(['a', 'b', '1', '2', '3']);
  });
  it('should have more additional IDs', () => {
    const ids = mapper.findAllIdentities(['c', 'd'], {
      c: ['1', '2', 'e'],
      e: ['10'],
      f: ['20'],
    });
    expect(ids).toEqual(['c', 'd', '1', '2', 'e', '10']);
  });
  it('should have even more additional IDs', () => {
    const ids = mapper.findAllIdentities(['g', 'h'], {
      g: ['1', '2', 'i'],
      i: ['10', 'g', 'j'],
      j: ['g', 'i'],
    });
    expect(ids).toEqual(['g', 'h', '1', '2', 'i', '10', 'j']);
  });
});
