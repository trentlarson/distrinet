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
  dependents: Array<UiTree>;
  dependentsExpanded: boolean;
  subtasks: Array<UiTree>;
  subtasksExpanded: boolean;
}

export enum UiTreeProperty {
  DEPENDENTS_EXP = 'dependentsExpanded',
  SUBTASKS_EXP = 'subtasksExpanded',
}

export enum UiTreeLinkageProperty {
  DEPENDENTS = 'dependents',
  SUBTASKS = 'subtasks',
}

/**
 * return a UiTree model for the given yamlTaskList
 */
export function uiTreeFromYamlTaskList(yamlTaskList: Array<YamlTask>): UiTree {
  return {
    dependents: R.map(
      (task) => uiTreeFromYamlTaskList(task.dependents),
      yamlTaskList
    ),
    dependentsExpanded: false,
    subtasks: R.map(
      (task) => uiTreeFromYamlTaskList(task.subtasks),
      yamlTaskList
    ),
    subtasksExpanded: false,
  };
}

/**
 * return boolean value of 'subtasksExpanded' at the subtaskPath in subtasksToExpand
 */
export function areLinkedTasksExpanded(
  linkageProperty: UiTreeLinkageProperty,
  subtaskPath: Array<number>,
  subtasksToExpand: UiTree
): boolean {
  if (!subtasksToExpand) {
    console.log(
      'Empty areLinkedTasksExpanded subtasksToExpand',
      subtasksToExpand
    );
    return false;
  }
  if (subtaskPath.length === 0) {
    return subtasksToExpand.subtasksExpanded;
  }
  const result = areLinkedTasksExpanded(
    linkageProperty,
    R.drop(1, subtaskPath),
    subtasksToExpand[linkageProperty][subtaskPath[0]]
  );
  return result;
}

/**
 * linkageProperty is currently 'subtasks' or 'dependents'
 *
 * return copy of uiTreeToEditOneSource with the item at path subtaskPath edited via editFun
 */
export function editUiTreeAtPathOneSource(
  linkageProperty: UiTreeLinkageProperty,
  editFun: (arg0: UiTree) => UiTree,
  uiTreePath: Array<number>,
  uiTreeToEdit: UiTree
): UiTree {
  if (uiTreePath.length === 0) {
    return editFun(uiTreeToEdit);
  }

  // there are more items in the uiTreePath

  if (R.isNil(uiTreePath[0])) {
    throw Error(
      `Got bad uiTree path in editUiTreeAtPathOneSource: ${
        uiTreePath[0]
      } ... for uiTreePath ${JSON.stringify(
        uiTreePath
      )} ... for uiTreeToEdit ${JSON.stringify(uiTreeToEdit)}`
    );
  }

  const key = uiTreePath[0];
  const remainingPath: Array<number> = R.drop(1, uiTreePath);
  const newUiTree: Array<UiTree> = R.adjust(
    key,
    R.curry(editUiTreeAtPathOneSource)(linkageProperty)(editFun)(remainingPath),
    R.clone(R.prop(linkageProperty, uiTreeToEdit))
  );
  const result = R.set(R.lensProp(linkageProperty), newUiTree, uiTreeToEdit);
  return result;
}

export function editUiTreeAtPath(
  linkageProperty: UiTreeLinkageProperty,
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
