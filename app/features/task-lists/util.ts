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
export function uiTreeFromYamlTask(activity: YamlTask): UiTree {
  const dependents = activity.dependents.map(uiTreeFromYamlTask);
  const subtasks = activity.subtasks.map(uiTreeFromYamlTask);
  const result = {
    dependents,
    dependentsExpanded: false,
    subtasks,
    subtasksExpanded: false,
  };
  return result;
}

/**
 * return boolean value of 'subtasksExpanded' at the subtaskPath in subtasksToExpand
 */
export function areLinkedTasksExpanded(
  linkageProperty: UiTreeLinkageProperty,
  subtaskPath: Array<number>,
  subtasksToExpand: Array<UiTree>
): boolean {
  if (subtaskPath.length === 0
      || subtasksToExpand.length === 0
      || subtaskPath[0] > subtasksToExpand.length - 1) {
    console.log(
      'Empty or mismatched list for areLinkedTasksExpanded:',
      subtaskPath,
      subtasksToExpand
    );
    return false;
  }
  const nextIndex = subtaskPath[0];
  if (subtaskPath.length === 1) {
    return subtasksToExpand[nextIndex].subtasksExpanded
  }
  const result = areLinkedTasksExpanded(
    linkageProperty,
    R.drop(1, subtaskPath),
    subtasksToExpand[nextIndex][linkageProperty]
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
  uiTreesToEdit: Array<UiTree>
): Array<UiTree> {

  if (uiTreePath.length === 0) {
    return uiTreesToEdit;
  }
  if (uiTreePath[0] > uiTreesToEdit.length - 1) {
    console.log(
      'Empty or mismatched list for editUiTreeAtPathOneSource:',
      uiTreePath,
      uiTreesToEdit
    );
    return uiTreesToEdit;
  }
  const index = uiTreePath[0];
  const remainingPath: Array<number> = R.drop(1, uiTreePath);
  let elem: UiTree = uiTreesToEdit[index];
  if (remainingPath.length === 0) {
    elem = editFun(elem);
  } else {
    elem = R.set(
      R.lensProp(linkageProperty),
      editUiTreeAtPathOneSource(
        linkageProperty,
        editFun,
        remainingPath,
        elem[linkageProperty]
      ),
      elem
    );
  }

  return R.update(index, elem, uiTreesToEdit);
}

export function editUiTreeAtPath(
  linkageProperty: UiTreeLinkageProperty,
  editFun: (arg0: UiTree) => UiTree,
  sourceId: string,
  uiTreePath: Array<number>,
  uiTreesToEdit: Record<string, Array<UiTree>>
): Record<string, Array<UiTree>> {
  uiTreesToEdit[sourceId] = editUiTreeAtPathOneSource(
    linkageProperty,
    editFun,
    uiTreePath,
    uiTreesToEdit[sourceId]
  );
  return uiTreesToEdit;
}
