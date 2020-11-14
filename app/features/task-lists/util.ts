import * as R from 'ramda';

import { YamlTask } from './taskListsSlice';

export interface SubtaskPath {
  expanded: boolean;
  subtasks: Array<SubtaskPath>;
}

/**
 * return a SubtaskPath model for the given yamlTaskList
 */
export function subtaskPathFromYamlTaskList(
  yamlTaskList: Array<YamlTask>
): SubtaskPath {
  return {
    expanded: false,
    subtasks: R.map(
      (task) => subtaskPathFromYamlTaskList(task.subtasks),
      yamlTaskList
    ),
  };
}

/**
 * return boolean value of 'expanded' at the subtaskPath in subtasksToExpand
 */
export function areSubtasksExpanded(
  subtaskPath: Array<number>,
  subtasksToExpand: SubtaskPath
): boolean {
  if (subtaskPath.length === 0) {
    return subtasksToExpand.expanded;
  }
  return areSubtasksExpanded(
    R.drop(1, subtaskPath),
    subtasksToExpand.subtasks[subtaskPath[0]]
  );
}

/**
 * return subtasksToExpand with the 'expanded' toggled at path subtaskPath
 */
export function toggleSubtasksExpanded(
  subtaskPath: Array<number>,
  subtasksToExpand: SubtaskPath
): SubtaskPath {
  if (subtaskPath.length === 0) {
    return {
      expanded: !subtasksToExpand.expanded,
      subtasks: subtasksToExpand.subtasks,
    };
  }

  // there are more items in the subtaskPath

  if (R.isNil(subtaskPath[0])) {
    throw Error(
      `Got bad path in toggleSubtasksExpanded: ${
        subtaskPath[0]
      } ... for subtaskPath ${JSON.stringify(
        subtaskPath
      )} ... for subtasksToExpand ${JSON.stringify(subtasksToExpand)}`
    );
  }

  const remainingPath: Array<number> = R.drop(1, subtaskPath);
  return {
    expanded: subtasksToExpand.expanded,
    subtasks: R.adjust(
      subtaskPath[0],
      R.curry(toggleSubtasksExpanded)(remainingPath),
      subtasksToExpand.subtasks
    ),
  };
}
