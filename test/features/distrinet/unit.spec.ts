import * as uriTools from '../../../app/features/distnet/uriTools';

describe('uriTools', () => {
  it('fragment detection works', () => {
    expect(uriTools.uriFragment('#')).toBe('');
    expect(uriTools.uriFragment('#abc')).toBe('abc');
    expect(uriTools.uriFragment('file:///Users/here?what')).toBe(null);
    expect(uriTools.uriFragment('http://zyx.com/#')).toBe('');
    expect(uriTools.uriFragment('http://zyx.com/#123')).toBe('123');
  });
  it('fragment removal works', () => {
    expect(uriTools.removeFragment('#')).toBe('');
    expect(uriTools.removeFragment('#abc')).toBe('');
    expect(uriTools.removeFragment('file:///Users/here?what')).toBe('file:///Users/here?what');
    expect(uriTools.removeFragment('http://zyx.com/#')).toBe('http://zyx.com/');
    expect(uriTools.removeFragment('http://zyx.com/blah#123')).toBe('http://zyx.com/blah');
  });
});
