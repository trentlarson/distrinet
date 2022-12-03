import * as R from 'ramda';

import {
  aggregateReferencedTaskCounts,
  getRefValues,
  hasLabelInSummary,
  labelsAndValuesObject,
  labelValueInSummary,
  sortedReferencedTasks,
  taskFromString,
  taskWithLabelsFromString,
  toggleProperty
} from '../../../app/features/task-lists/taskListsSlice';
import {
  editUiTreeAtPathOneSource,
  lastSignificantChars,
  onlyBiggest5,
  posOfFirstEstimateSmallerThan,
  UiTreeLinkageProperty,
  UiTreeProperty,
} from '../../../app/features/task-lists/util';

export const toggleSubtaskExpanded = toggleProperty(
  UiTreeProperty.SUBTASKS_EXP
);

describe('label functions', () => {
  it('should parse labels', () => {
    expect(labelsAndValuesObject('')).toEqual({});
    expect(labelsAndValuesObject('something')).toEqual({});
    expect(labelsAndValuesObject('something else id:else date:2022-12-03 due:tomorrow')).toEqual({id:'else', date:'2022-12-03', due:'tomorrow'});
  });
  it('should detect label', () => {
    expect(hasLabelInSummary('due', 'something is due')).toBeFalsy();
    expect(hasLabelInSummary('due', 'due:2021-11-21 something')).toBeTruthy();
    expect(hasLabelInSummary('due', 'something is to do due:2021-11-21')).toBeTruthy();
  });

  it('should find label value', () => {
    expect(labelValueInSummary('due', 'something is due')).toBeNull();
    expect(labelValueInSummary('due', 'due:2021-11-21')).toBe('2021-11-21');
    expect(labelValueInSummary('due', 'something is to do due:2021-12-21')).toBe('2021-12-21');
  });
});

describe('position in array with smaller estimate', () => {
  it('should be 0 in empty array', () => {
    expect(posOfFirstEstimateSmallerThan(-1, [])).toBe(0);
    expect(posOfFirstEstimateSmallerThan(3, [])).toBe(0);
    expect(posOfFirstEstimateSmallerThan(null, [])).toBe(0);
  });

  it('should be correct in these arrays', () => {

    const y = [{}, { estimate: NaN}];
    expect(posOfFirstEstimateSmallerThan(5, y)).toBe(0);
    expect(posOfFirstEstimateSmallerThan(Infinity, y)).toBe(0);
    expect(posOfFirstEstimateSmallerThan(NaN, y)).toBe(2);
    expect(posOfFirstEstimateSmallerThan(null, y)).toBe(2);
    expect(posOfFirstEstimateSmallerThan(undefined, y)).toBe(2);

    const z = [{ estimate: NaN}, {}];
    expect(posOfFirstEstimateSmallerThan(0, z)).toBe(0);
    expect(posOfFirstEstimateSmallerThan(Infinity, z)).toBe(0);
    expect(posOfFirstEstimateSmallerThan(NaN, z)).toBe(2);
    expect(posOfFirstEstimateSmallerThan(null, z)).toBe(2);
    expect(posOfFirstEstimateSmallerThan(undefined, z)).toBe(2);

    const a = [{ estimate: 4 }];
    expect(posOfFirstEstimateSmallerThan(5, a)).toBe(0);
    expect(posOfFirstEstimateSmallerThan(4, a)).toBe(1);
    expect(posOfFirstEstimateSmallerThan(3, a)).toBe(1);
    expect(posOfFirstEstimateSmallerThan(Infinity, a)).toBe(0);
    expect(posOfFirstEstimateSmallerThan(NaN, a)).toBe(1);
    expect(posOfFirstEstimateSmallerThan(null, a)).toBe(1);
    expect(posOfFirstEstimateSmallerThan(undefined, a)).toBe(1);

    const b = [{ estimate: 4 }, { estimate: 3 }];
    expect(posOfFirstEstimateSmallerThan(5, b)).toBe(0);
    expect(posOfFirstEstimateSmallerThan(4, b)).toBe(1);
    expect(posOfFirstEstimateSmallerThan(3.5, b)).toBe(1);
    expect(posOfFirstEstimateSmallerThan(3, b)).toBe(2);
    expect(posOfFirstEstimateSmallerThan(Infinity, b)).toBe(0);
    expect(posOfFirstEstimateSmallerThan(NaN, b)).toBe(2);
    expect(posOfFirstEstimateSmallerThan(null, b)).toBe(2);
    expect(posOfFirstEstimateSmallerThan(undefined, b)).toBe(2);

    const c = [{ estimate: 4 }, { estimate: 3 }, { estimate: 1 }, { estimate: NaN }, {}];
    expect(posOfFirstEstimateSmallerThan(1, c)).toBe(3);
    expect(posOfFirstEstimateSmallerThan(0, c)).toBe(3);
    expect(posOfFirstEstimateSmallerThan(Infinity, c)).toBe(0);
    expect(posOfFirstEstimateSmallerThan(NaN, c)).toBe(5);
    expect(posOfFirstEstimateSmallerThan(null, c)).toBe(5);
    expect(posOfFirstEstimateSmallerThan(undefined, c)).toBe(5);

    const d = [{ estimate: 4 }, { estimate: 3 }, { estimate: 1 }, { estimate: 0 }, {}];
    expect(posOfFirstEstimateSmallerThan(100, d)).toBe(0);
    expect(posOfFirstEstimateSmallerThan(5, d)).toBe(0);
    expect(posOfFirstEstimateSmallerThan(4, d)).toBe(1);
    expect(posOfFirstEstimateSmallerThan(3, d)).toBe(2);
    expect(posOfFirstEstimateSmallerThan(2, d)).toBe(2);
    expect(posOfFirstEstimateSmallerThan(1, d)).toBe(3);
    expect(posOfFirstEstimateSmallerThan(0, d)).toBe(4);
    expect(posOfFirstEstimateSmallerThan(-1, d)).toBe(4);
    expect(posOfFirstEstimateSmallerThan(-33, d)).toBe(4);
    expect(posOfFirstEstimateSmallerThan(Infinity, d)).toBe(0);
    expect(posOfFirstEstimateSmallerThan(NaN, d)).toBe(5);
    expect(posOfFirstEstimateSmallerThan(null, d)).toBe(5);
    expect(posOfFirstEstimateSmallerThan(undefined, d)).toBe(5);

    const e = [{ estimate: 4 }, { estimate: 3 }, { estimate: 1 }, { estimate: 0 }, { estimate: -1 }];
    expect(posOfFirstEstimateSmallerThan(-1, e)).toBe(5);
    expect(posOfFirstEstimateSmallerThan(-33, e)).toBe(5);
    expect(posOfFirstEstimateSmallerThan(Infinity, e)).toBe(0);
    expect(posOfFirstEstimateSmallerThan(NaN, e)).toBe(5);
    expect(posOfFirstEstimateSmallerThan(null, e)).toBe(5);
    expect(posOfFirstEstimateSmallerThan(undefined, e)).toBe(5);

  });
});

describe('onlyBiggest5', () => {

  it('should get none', () => {
    expect(onlyBiggest5([])).toEqual([]);
  });

  const a = [{ estimate: 4 }];
  const b = [{ estimate: 4 }, { estimate: 3 }];

  it('should get same list', () => {
    expect(onlyBiggest5(a)).toEqual(a);
    expect(onlyBiggest5(b)).toEqual(b);
  });

  const c = [{ estimate: 4 }, { estimate: 3 }, { estimate: 1 }, { estimate: 2 }];
  const cTop = [{ estimate: 4 }, { estimate: 3 }, { estimate: 2 }, { estimate: 1 }];

  // this one is all in order
  const d = [{ estimate: 100 }, { estimate: 10 }, { estimate: 4 }, { estimate: 3 }, { estimate: 3, last: true }, { estimate: 1}, { estimate: 0 }, { estimate: -1 }]; // the 'last' is just to distinguish from the earlier element
  const dTop = [{ estimate: 100 }, { estimate: 10 }, { estimate: 4 }, { estimate: 3 }, { estimate: 3, last: true }];

  // this one is out of order
  const e = [{ estimate: 0 }, { estimate: 4 }, { estimate: 10 }, { estimate: 3 }, { estimate: 100 }, { estimate: -1 }, { estimate: 1 }, { estimate: 3, last: true }]; // the 'last' is just to distinguish from the earlier element
  const eTop = [{ estimate: 100 }, { estimate: 10 }, { estimate: 4 }, { estimate: 3 }, { estimate: 3, last: true }];


  it('should get a subset', () => {
    expect(onlyBiggest5(c)).toEqual(cTop);
    expect(onlyBiggest5(d)).toEqual(dTop);
    expect(onlyBiggest5(e)).toEqual(eTop);
  });
});

describe('taskFromString', () => {
  it('should parse with both priority and estimate', () => {
    expect(taskFromString('', '90 4 test me silly').summary).toBe(
      'test me silly'
    );
    expect(taskFromString('', '-900 -1 test me silly').summary).toBe(
      'test me silly'
    );
    expect(taskFromString('', ' 9.876 -1.0 test me silly').summary).toBe(
      'test me silly'
    );
    expect(taskFromString('', ' 9.876 -1.0 ').summary).toBe('');
  });
  it('should parse with only priority', () => {
    expect(taskFromString('', ' 9.876 ').summary).toBe('');
    expect(taskFromString('', '0 test me silly').summary).toBe('test me silly');
    expect(taskFromString('', ' -9.876 test me silly').summary).toBe(
      'test me silly'
    );
  });
  it('should parse with no priority', () => {
    expect(taskFromString('', '').summary).toBe('');
    expect(taskFromString('', '    ').summary).toBe('');
    expect(taskFromString('', ' test me silly').summary).toBe('test me silly');
  });
  it('should parse with no priority', () => {
    expect(taskWithLabelsFromString('', 'some task id:some due:tomorrow').summary).toBe('some task id:some due:tomorrow');
    expect(taskWithLabelsFromString('', 'some task id:some due:tomorrow').id).toBe('some');
    expect(taskWithLabelsFromString('', 'some task id:some due:tomorrow').due).toBe('tomorrow');
  });
});

const sub1false = { subtasksExpanded: false, subtasks: [] };
const sub1true = { subtasksExpanded: true, subtasks: [] };
const sub21false = {
  subtasksExpanded: false,
  subtasks: [ R.clone(sub1true), R.clone(sub1true), R.clone(sub1false) ]
};
const sub21true = {
  subtasksExpanded: true,
  subtasks: [ R.clone(sub1true), R.clone(sub1true), R.clone(sub1false) ]
};
const sub21trueMidFalse = {
  subtasksExpanded: true,
  subtasks: [ R.clone(sub1true), R.clone(sub1false), R.clone(sub1false) ]
};
const sub322false = {
  subtasksExpanded: false,
  subtasks: [ R.clone(sub21false), R.clone(sub21true), R.clone(sub1false), R.clone(sub1true) ]
};
const sub322true = {
  subtasksExpanded: true,
  subtasks: [ R.clone(sub21false), R.clone(sub21true), R.clone(sub1false), R.clone(sub1true) ]
};
const sub322trueMidFalse = {
  subtasksExpanded: true,
  subtasks: [ R.clone(sub21false), R.clone(sub21trueMidFalse), R.clone(sub1false), R.clone(sub1true) ]
};
const sub322trueLastFalse = {
  subtasksExpanded: true,
  subtasks: [ R.clone(sub21false), R.clone(sub21true), R.clone(sub1false), R.clone(sub1false) ]
};

describe('editUiTreeAtPathOneSource', () => {
  it('should toggle at the right level', () => {
    expect(editUiTreeAtPathOneSource(
      'subtasks',
      toggleSubtaskExpanded,
      [{ index: 0, path: UiTreeLinkageProperty.SUBTASKS}],
      [sub1false]
    ))
    .toEqual([sub1true]);

    expect(editUiTreeAtPathOneSource(
      'subtasks',
      toggleSubtaskExpanded,
      [{ index: 0, path: UiTreeLinkageProperty.SUBTASKS}],
      [sub1true]
    ))
    .toEqual([sub1false]);

    expect(editUiTreeAtPathOneSource(
      'subtasks',
      toggleSubtaskExpanded,
      [{ index: 0, path: UiTreeLinkageProperty.SUBTASKS}],
      [sub322false]
    ))
    .toEqual([sub322true]);

    expect(editUiTreeAtPathOneSource(
      'subtasks',
      toggleSubtaskExpanded,
      [
        { index: 0, path: UiTreeLinkageProperty.SUBTASKS},
        { index: 3, path: UiTreeLinkageProperty.SUBTASKS},
      ],
      [sub322true]
    ))
    .toEqual([sub322trueLastFalse]);

    expect(editUiTreeAtPathOneSource(
      'subtasks',
      toggleSubtaskExpanded,
      [
        { index: 0, path: UiTreeLinkageProperty.SUBTASKS},
        { index: 1, path: UiTreeLinkageProperty.SUBTASKS},
        { index: 1, path: UiTreeLinkageProperty.SUBTASKS},
      ],
      [sub322true]
    ))
    .toEqual([sub322trueMidFalse]);
  });
});

describe('determine task list', () => {
  it('should get all ref: labels', () => {
    expect(getRefValues('')).toEqual([]);
    expect(getRefValues('Got something')).toEqual([]);
    expect(getRefValues('Got some against ref:gabba')).toEqual(['gabba']);
    expect(getRefValues('Got some for both ref:gabba and ref:hey')).toEqual(['gabba', 'hey']);
    expect(getRefValues('ref:stuff is related to ref:hey yo')).toEqual(['stuff', 'hey']);
  });
});

describe('aggregate task list counts', () => {
  const list1 = {
    'taskyaml:test-distrinet.com': [
      { 'summary': 'Lots of stuff' },
      { 'summary': 'Moar' },
    ]
  };
  const list2 = {
    'taskyaml:test-distrinet.com': [
      { 'summary': 'Lots of stuff ref:stuff' },
      { 'summary': 'Moar' },
    ],
  };
  const list3 = {
    'taskyaml:test-distrinet.com': [
      { 'summary': 'Stuff id:stuff' },
      { 'summary': 'Lots of stuff ref:stuff' },
      { 'summary': 'Moar' },
    ],
    'taskyaml:test-distrinet-2.com': [
      { 'summary': 'Lots of stuff like ref:stuff' },
      { 'summary': 'Lots of stuff like ref:taskyaml:test-distrinet.com#stuff too' },
      { 'summary': 'Moar but nothing special id:moar' },
      { 'summary': 'Moar ref:moar too' },
      { 'summary': 'Moar ref:taskyaml:test-distrinet-3.com/another-thing big too' },
      { 'summary': 'Moar ref:taskyaml:test-distrinet-2.com#moar big too 2' },
      { 'summary': 'Moar ref:taskyaml:test-distrinet-2.com#moar big three' },
    ],
  };

  it('should aggregate references correctly', () => {
    expect(aggregateReferencedTaskCounts([])).toEqual({});
    expect(aggregateReferencedTaskCounts(list1)).toEqual({});
    expect(aggregateReferencedTaskCounts(list2)).toEqual({
      'taskyaml:test-distrinet.com#stuff': 1,
    });
    expect(aggregateReferencedTaskCounts(list3)).toEqual({
      'taskyaml:test-distrinet.com#stuff': 2,
      'taskyaml:test-distrinet-2.com#moar': 3,
      'taskyaml:test-distrinet-2.com#stuff': 1,
      'taskyaml:test-distrinet-3.com/another-thing': 1,
    });
  });

  it('should aggregate & sort references correctly', () => {
    expect(sortedReferencedTasks([])).toEqual([]);
    expect(sortedReferencedTasks(list1)).toEqual([]);
    expect(sortedReferencedTasks(list2)).toEqual([
      ['taskyaml:test-distrinet.com#stuff', 1],
    ]);

    // to be precise, this should check descending order (ignoring keys)
    expect(sortedReferencedTasks(list3)).toEqual([
      ['taskyaml:test-distrinet-2.com#moar', 3],
      ['taskyaml:test-distrinet.com#stuff', 2],
      ['taskyaml:test-distrinet-3.com/another-thing', 1],
      ['taskyaml:test-distrinet-2.com#stuff', 1],
    ]);
  });

  it('should return the end of a URL', () => {
    expect(lastSignificantChars(null)).toEqual(null);
    expect(lastSignificantChars('')).toEqual('');
    expect(lastSignificantChars('http://')).toEqual('');
    expect(lastSignificantChars('file:///Users/me/here')).toEqual('here');
    expect(lastSignificantChars('file:///Users/me/here#')).toEqual('');
    expect(lastSignificantChars('file:///Users/me/here#stuff_and_puff')).toEqual('stuff_and_puff');
    expect(lastSignificantChars('file:///Users/me/here#stuff_and_puff.are.all.related.html')).toEqual('stuff_an...ted.html');
  });

});
