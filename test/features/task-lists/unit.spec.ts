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
  });

  const a = [{ estimate: 4 }];
  const b = [{ estimate: 4 }, { estimate: 3 }];
  const c = [{ estimate: 4 }, { estimate: 3 }, { estimate: 1 }, { estimate: -1 }];

  it('should be correct in these arrays', () => {
    expect(posOfFirstEstimateSmallerThan(5, a)).toBe(0);
    expect(posOfFirstEstimateSmallerThan(4, a)).toBe(1);
    expect(posOfFirstEstimateSmallerThan(3, a)).toBe(1);

    expect(posOfFirstEstimateSmallerThan(5, b)).toBe(0);
    expect(posOfFirstEstimateSmallerThan(4, b)).toBe(1);
    expect(posOfFirstEstimateSmallerThan(3.5, b)).toBe(1);
    expect(posOfFirstEstimateSmallerThan(3, b)).toBe(2);

    expect(posOfFirstEstimateSmallerThan(100, c)).toBe(0);
    expect(posOfFirstEstimateSmallerThan(5, c)).toBe(0);
    expect(posOfFirstEstimateSmallerThan(4, c)).toBe(1);
    expect(posOfFirstEstimateSmallerThan(3, c)).toBe(2);
    expect(posOfFirstEstimateSmallerThan(2, c)).toBe(2);
    expect(posOfFirstEstimateSmallerThan(1, c)).toBe(3);
    expect(posOfFirstEstimateSmallerThan(0, c)).toBe(3);
    expect(posOfFirstEstimateSmallerThan(-1, c)).toBe(4);
    expect(posOfFirstEstimateSmallerThan(-33, c)).toBe(4);

  });
});

describe('onlyBiggest5', () => {

  it('should get none', () => {
    expect(onlyBiggest5([])).toEqual([]);
  });

  const a = [{ estimate: 4 }];
  const b = [{ estimate: 4 }, { estimate: 3 }];
  const c = [{ estimate: 4 }, { estimate: 3 }, { estimate: 1 }, { estimate: 2 }];
  const cTop = [{ estimate: 4 }, { estimate: 3 }, { estimate: 2 }, { estimate: 1 }];

  it('should get same list', () => {
    expect(onlyBiggest5(a)).toEqual(a);
    expect(onlyBiggest5(b)).toEqual(b);
    expect(onlyBiggest5(c)).toEqual(cTop);
  });

  const d = [{ estimate: 0 }, { estimate: 4 }, { estimate: 10 }, { estimate: 3 }, { estimate: 100 }, { estimate: -1 }, { estimate: 1 }, { estimate: 3, last: true }]; // the 'last' is just to distinguish from the earlier element
  const dTop = [{ estimate: 100 }, { estimate: 10 }, { estimate: 4 }, { estimate: 3 }, { estimate: 3, last: true }];

  it('should get a subset', () => {
    expect(onlyBiggest5(d)).toEqual(dTop);
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