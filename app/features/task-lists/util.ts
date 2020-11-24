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

export interface UiTree {
  dependentsExpanded: boolean;
  subtasksExpanded: boolean;
  subtasks: Array<UiTree>;
}

/**
 * return a UiTree model for the given yamlTaskList
 */
export function uiTreeFromYamlTaskList(yamlTaskList: Array<YamlTask>): UiTree {
  return {
    subtasksExpanded: false,
    dependentsExpanded: false,
    subtasks: R.map(
      (task) => uiTreeFromYamlTaskList(task.subtasks),
      yamlTaskList
    ),
  };
}

/**
 * return boolean value of 'subtasksExpanded' at the subtaskPath in subtasksToExpand
 */
export function areSubtasksExpanded(
  subtaskPath: Array<number>,
  subtasksToExpand: UiTree
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
 * linkageProperty is currently 'subtasks' or 'dependents'
 *
 * return copy of subtasksToEditOneSource with the item at path subtaskPath edited via editFun
 */
export function editUiTreeAtPathOneSource(
  linkageProperty: string,
  editFun: (arg0: UiTree) => UiTree,
  uiTreePath: Array<number>,
  uiTreesToEditOneSource: UiTree
): UiTree {
  if (uiTreePath.length === 0) {
    return editFun(uiTreesToEditOneSource);
  }

  // there are more items in the uiTreePath

  if (R.isNil(uiTreePath[0])) {
    throw Error(
      `Got bad uiTree path in editUiTreeAtPathOneSource: ${
        uiTreePath[0]
      } ... for uiTreePath ${JSON.stringify(
        uiTreePath
      )} ... for uiTreesToEditOneSource ${JSON.stringify(
        uiTreesToEditOneSource
      )}`
    );
  }

  const key = uiTreePath[0];
  const remainingPath: Array<number> = R.drop(1, uiTreePath);
  const newUiTrees: Array<UiTree> = R.adjust(
    key,
    R.curry(editUiTreeAtPathOneSource)(linkageProperty)(editFun)(remainingPath),
    R.clone(R.prop(linkageProperty, uiTreesToEditOneSource))
  );
  const result = R.set(
    R.lensProp(linkageProperty),
    newUiTrees,
    uiTreesToEditOneSource
  );
  return result;
}

export function editUiTreeAtPath(
  linkageProperty: string,
  editFun: (arg0: UiTree) => UiTree,
  sourceId: string,
  uiTreePath: Array<number>,
  uiTreesToEdit: Record<string, UiTree>
): Record<string, UiTree> {
  uiTreesToEdit[sourceId] = editUiTreeAtPathOneSource(
    linkageProperty,
    editFun,
    uiTreePath,
    uiTreesToEdit[sourceId]
  );
  return uiTreesToEdit;
}
