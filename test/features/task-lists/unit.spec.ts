import * as R from 'ramda';

import { taskFromString } from '../../../app/features/task-lists/taskListsSlice';
import { toggleSubtasksExpandedOneSource } from '../../../app/features/task-lists/util';

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

const sub1false = { expanded: false, subtasks: [] };
const sub1true = { expanded: true, subtasks: [] };
const sub21false = {
  expanded: false,
  subtasks: [ R.clone(sub1true), R.clone(sub1true), R.clone(sub1false) ]
};
const sub21true = {
  expanded: true,
  subtasks: [ R.clone(sub1true), R.clone(sub1true), R.clone(sub1false) ]
};
const sub21trueMidFalse = {
  expanded: true,
  subtasks: [ R.clone(sub1true), R.clone(sub1false), R.clone(sub1false) ]
};
const sub322false = {
  expanded: false,
  subtasks: [ R.clone(sub21false), R.clone(sub21true), R.clone(sub1false), R.clone(sub1true) ]
};
const sub322true = {
  expanded: true,
  subtasks: [ R.clone(sub21false), R.clone(sub21true), R.clone(sub1false), R.clone(sub1true) ]
};
const sub322trueMidFalse = {
  expanded: true,
  subtasks: [ R.clone(sub21false), R.clone(sub21trueMidFalse), R.clone(sub1false), R.clone(sub1true) ]
};
const sub322trueLastFalse = {
  expanded: true,
  subtasks: [ R.clone(sub21false), R.clone(sub21true), R.clone(sub1false), R.clone(sub1false) ]
};

describe('toggleSubtasksExpandedOneSource', () => {
  it('should toggle at the right level', () => {
    expect(toggleSubtasksExpandedOneSource([], sub1false)).toEqual(sub1true);
    expect(toggleSubtasksExpandedOneSource([], sub1true)).toEqual(sub1false);
    expect(toggleSubtasksExpandedOneSource([], sub322false)).toEqual(sub322true);
    expect(toggleSubtasksExpandedOneSource([3], sub322true)).toEqual(sub322trueLastFalse);
    expect(toggleSubtasksExpandedOneSource([1, 1], sub322true)).toEqual(sub322trueMidFalse);
  });
});