import * as R from 'ramda';

import { taskFromString, toggleSubtaskExpanded } from '../../../app/features/task-lists/taskListsSlice';
import { editUiTreeAtPathOneSource } from '../../../app/features/task-lists/util';

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
    expect(editUiTreeAtPathOneSource('subtasks', toggleSubtaskExpanded, [0], [sub1false]))
    .toEqual([sub1true]);

    expect(editUiTreeAtPathOneSource('subtasks', toggleSubtaskExpanded, [0], [sub1true]))
    .toEqual([sub1false]);

    expect(editUiTreeAtPathOneSource('subtasks', toggleSubtaskExpanded, [0], [sub322false]))
    .toEqual([sub322true]);

    expect(editUiTreeAtPathOneSource('subtasks', toggleSubtaskExpanded, [0, 3], [sub322true]))
    .toEqual([sub322trueLastFalse]);

    expect(editUiTreeAtPathOneSource('subtasks', toggleSubtaskExpanded, [0, 1, 1], [sub322true]))
    .toEqual([sub322trueMidFalse]);
  });
});