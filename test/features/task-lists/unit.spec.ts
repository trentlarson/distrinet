import { taskFromString } from '../../../app/features/task-lists/taskListsSlice';

describe('taskFromString', () => {
  it('should parse with both priority and estimate', () => {
    expect(taskFromString('', '90 4 test me silly').description)
    .toBe('test me silly');
    expect(taskFromString('', '-900 -1 test me silly').description)
    .toBe('test me silly');
    expect(taskFromString('', ' 9.876 -1.0 test me silly').description)
    .toBe('test me silly');
  });
  it('should parse with only priority', () => {
    expect(taskFromString('', '0 test me silly').description)
    .toBe('test me silly');
    expect(taskFromString('', ' -9.876 test me silly').description)
    .toBe('test me silly');
  });
  it('should parse with no priority', () => {
    expect(taskFromString('', ' test me silly').description)
    .toBe('test me silly');
  });
});
