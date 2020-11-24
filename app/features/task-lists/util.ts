import * as R from 'ramda';

/**
 * This doesn't have an ID because it's not required and we'll often have to
 * generate an ID, so that should use a different type than this raw data.
 */
export interface YamlTask {
  sourceId: string;
  priority: number | null;
  estimate: number | null;
  summary: string;
  dependents: Array<YamlTask>;
  subtasks: Array<YamlTask>;
}

export interface SubtaskPath {
  subtasksExpanded: boolean;
  subtasks: Array<SubtaskPath>;
}

/**
 * return a SubtaskPath model for the given yamlTaskList
 */
export function subtaskPathFromYamlTaskList(
  yamlTaskList: Array<YamlTask>
): SubtaskPath {
  return {
    subtasksExpanded: false,
    subtasks: R.map(
      (task) => subtaskPathFromYamlTaskList(task.subtasks),
      yamlTaskList
    ),
  };
}

/**
 * return boolean value of 'subtasksExpanded' at the subtaskPath in subtasksToExpand
 */
export function areSubtasksExpanded(
  subtaskPath: Array<number>,
  subtasksToExpand: SubtaskPath
): boolean {
  if (!subtasksToExpand) {
    console.log('Empty areSubtasksExpanded subtasksToExpand', subtasksToExpand);
    return false;
  }
  if (subtaskPath.length === 0) {
    return subtasksToExpand.subtasksExpanded;
  }
  const result = areSubtasksExpanded(
    R.drop(1, subtaskPath),
    subtasksToExpand.subtasks[subtaskPath[0]]
  );
  return result;
}

/**
 * return copy of subtasksToEditOneSource with the item at path subtaskPath edited via editFun
 */
export function editSubtaskAtPathOneSource(
  editFun: (arg0: SubtaskPath) => SubtaskPath,
  subtaskPath: Array<number>,
  subtasksToEditOneSource: SubtaskPath
): SubtaskPath {
  if (subtaskPath.length === 0) {
    return editFun(subtasksToEditOneSource);
  }

  // there are more items in the subtaskPath

  if (R.isNil(subtaskPath[0])) {
    throw Error(
      `Got bad subtask path in editSubtaskAtPathOneSource: ${
        subtaskPath[0]
      } ... for subtaskPath ${JSON.stringify(
        subtaskPath
      )} ... for subtasksToEditOneSource ${JSON.stringify(
        subtasksToEditOneSource
      )}`
    );
  }

  const key = subtaskPath[0];
  const remainingPath: Array<number> = R.drop(1, subtaskPath);
  const newSubtasks: Array<SubtaskPath> = R.adjust(
    key,
    R.curry(editSubtaskAtPathOneSource)(editFun)(remainingPath),
    R.clone(subtasksToEditOneSource.subtasks)
  );
  return {
    subtasksExpanded: subtasksToEditOneSource.subtasksExpanded,
    subtasks: newSubtasks,
  };
}

export function editSubtaskAtPath(
  editFun: (arg0: SubtaskPath) => SubtaskPath,
  sourceId: string,
  subtaskPath: Array<number>,
  subtasksToEdit: Record<string, SubtaskPath>
): Record<string, SubtaskPath> {
  subtasksToEdit[sourceId] = editSubtaskAtPathOneSource(
    editFun,
    subtaskPath,
    subtasksToEdit[sourceId]
  );
  return subtasksToEdit;
}
