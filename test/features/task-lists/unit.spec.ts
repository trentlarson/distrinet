import * as R from 'ramda';

import {
  onlyBiggest5,
  taskFromString,
  toggleProperty
} from '../../../app/features/task-lists/taskListsSlice';
import {
  editUiTreeAtPathOneSource,
  posOfFirstEstimateSmallerThan,
  UiTreeLinkageProperty,
  UiTreeProperty,
} from '../../../app/features/task-lists/util';

export const toggleSubtaskExpanded = toggleProperty(
  UiTreeProperty.SUBTASKS_EXP
);

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