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
  if (!subtasksToExpand) {
    console.log("Empty areSubtasksExpanded subtasksToExpand", subtasksToExpand);
    return false;
  } else if (subtaskPath.length === 0) {
    return subtasksToExpand.expanded;
  }
  let result = areSubtasksExpanded(
    R.drop(1, subtaskPath),
    subtasksToExpand.subtasks[subtaskPath[0]]
  );
  return result;
}

export function toggleSubtasksExpanded(
  sourceId: string,
  subtaskPath: Array<number>,
  subtasksToExpand: Record<string, SubtaskPath>
): Record<string, SubtaskPath> {
  subtasksToExpand[sourceId] =
    toggleSubtasksExpandedOneSource(subtaskPath, subtasksToExpand[sourceId]);
  return subtasksToExpand;
}

/**
 * return copy of subtasksToExpandOneSource with the 'expanded' toggled at path subtaskPath
 */
export function toggleSubtasksExpandedOneSource(
  subtaskPath: Array<number>,
  subtasksToExpandOneSource: SubtaskPath
): SubtaskPath {
  if (subtaskPath.length === 0) {
    return {
      expanded: !subtasksToExpandOneSource.expanded,
      subtasks: R.clone(subtasksToExpandOneSource.subtasks),
    };
  }

  // there are more items in the subtaskPath

  if (R.isNil(subtaskPath[0])) {
    throw Error(
      `Got bad path in toggleSubtasksExpanded: ${
        subtaskPath[0]
      } ... for subtaskPath ${JSON.stringify(
        subtaskPath
      )} ... for subtasksToExpandOneSource ${JSON.stringify(subtasksToExpandOneSource)}`
    );
  }

  let key = subtaskPath[0];
  const remainingPath: Array<number> = R.drop(1, subtaskPath);
  const newSubtasks: Array<SubtaskPath> = R.adjust(
    key,
    R.curry(toggleSubtasksExpandedOneSource)(remainingPath),
    R.clone(subtasksToExpandOneSource.subtasks)
  );
  return {
    expanded: subtasksToExpandOneSource.expanded,
    subtasks: newSubtasks,
  };
}
