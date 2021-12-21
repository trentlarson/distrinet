import { createSlice } from '@reduxjs/toolkit';
import nodeCrypto from 'crypto';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import * as R from 'ramda';
import url from 'url';
import * as uuid from 'uuid';

// imports in this app
// eslint-disable-next-line import/no-cycle
import { AppThunk } from '../../store';
import { CacheData, DistnetState, Payload } from '../distnet/distnetClasses';
import {
  isFileUrl,
  isGlobalUri,
  globalUriForId,
  globalUriScheme,
} from '../distnet/uriTools';
import {
  editUiTreeAtPathOneSource,
  UiTree,
  UiTreeBranch,
  UiTreeProperty,
  UiTreeLinkageProperty,
  uiTreeFromYamlTask,
  YamlTask,
} from './util';
// eslint-disable-next-line import/no-cycle
import {
  decryptFromBase64,
  dispatchReloadCacheForFile,
} from '../distnet/distnetSlice';

const DEFAULT_FORECAST_SERVER =
  'http://ec2-3-86-70-139.compute-1.amazonaws.com:8090';
const TASKYAML_SCHEME = 'taskyaml';

const fsPromises = fs.promises;

export const DEFAULT_HOURS_PER_WEEK = 40;
export const DEFAULT_TASK_COMMENT = 'I worked on this.';
export const ID_LABEL_KEY = 'id';
export const REF_LABEL_KEY = 'ref';

export interface ProjectFile {
  tasks: Array<YamlInputIssues>;
  log?: Array<Log>;
}

export interface Log {
  id: string;
  taskId: string;
  data: unknown;
  time: string;
  did?: string;
  publicKey?: string;
  signature?: string;
}

// Remember to keep the fields in alphabetical order for independently verifiable standard.
interface MessageForSigning {
  comment: string;
  did?: string;
  summary: string;
  taskUri: string;
  time: string;
}

interface IssueToSchedule {
  key: string;
  summary: string;
  priority: number | null;
  // number of seconds
  issueEstSecondsRaw: number | null;
  dueDate: string | null;
  mustStartOnDate: string | null;
  subtasks: Array<IssueToSchedule>;
  dependents: Array<IssueToSchedule>;
}

interface ForecastData {
  focusIssueId: string;
  hoursPerWeek: number;
  html: string;
  sourceId: string;
}
const EMPTY_FORECAST = {
  focusIssueId: '',
  hoursPerWeek: 40,
  html: '',
  sourceId: '',
} as ForecastData;

interface IdAndTaskList {
  sourceId: string;
  taskList: Array<YamlTask>;
}

interface SourceIdAndUiTrees {
  sourceId: string;
  uiTreeList: Array<UiTree>;
}

interface SettingAndSourceIdAndPathAndUiTrees {
  property: UiTreeProperty;
  linkage: UiTreeLinkageProperty;
  sourceId: string;
  uiTreePath: Array<UiTreeBranch>;
  allUiTrees: Record<string, Array<UiTree>>;
}

export const togglePropertyFun = (
  property: UiTreeProperty,
  uiTreePath: UiTree
) => {
  return R.set(R.lensProp(property), !R.prop(property, uiTreePath), uiTreePath);
};
export const toggleProperty = R.curry(togglePropertyFun);

const taskListsSlice = createSlice({
  name: 'taskLists',
  initialState: {
    allLists: {} as Record<string, Array<YamlTask>>,
    // 'display' is a record of which tasks have expanded subtasks or dependent tasks
    display: {} as Record<string, Array<UiTree>>,
    forecastData: EMPTY_FORECAST as ForecastData,
    linkedTasks: [] as [string, number][],
  },
  reducers: {
    setAllTaskLists: (state, tasks: Payload<Array<Array<YamlTask>>>) => {
      const newState: Record<string, Array<YamlTask>> = {};
      R.forEach((list: Array<YamlTask>) => {
        if (list.length > 0) {
          newState[list[0].sourceId] = list;
        }
      }, tasks.payload);
      state.allLists = newState;
    },
    setTaskList: (state, tasks: Payload<IdAndTaskList>) => {
      state.allLists[tasks.payload.sourceId] = tasks.payload.taskList;
    },
    setUiForPath: (state, sourceDisplay: Payload<SourceIdAndUiTrees>) => {
      state.display[sourceDisplay.payload.sourceId] =
        sourceDisplay.payload.uiTreeList;
    },
    setTopLinkedInfo: (state, linkedTasks: Payload<[string, number][]>) => {
      state.linkedTasks = linkedTasks.payload;
    },
    toggleLinkedTasksInSourceExpansionUi: (
      state,
      sourceAndUiTree: Payload<SettingAndSourceIdAndPathAndUiTrees>
    ) => {
      const uiTreeList =
        sourceAndUiTree.payload.allUiTrees[sourceAndUiTree.payload.sourceId];
      // note that this approach is unnecessary: we could do something similar to historiesSlice.markMatchInPath
      state.display[
        sourceAndUiTree.payload.sourceId
      ] = editUiTreeAtPathOneSource(
        sourceAndUiTree.payload.linkage,
        toggleProperty(sourceAndUiTree.payload.property),
        sourceAndUiTree.payload.uiTreePath,
        uiTreeList
      );
    },
    clearForecastData: (state) => {
      state.forecastData = EMPTY_FORECAST;
    },
    setForecastData: (state, html: Payload<ForecastData>) => {
      state.forecastData = html.payload;
    },
  },
});

export const {
  clearForecastData,
  setAllTaskLists,
  setForecastData,
  setTaskList,
  setTopLinkedInfo,
  setUiForPath,
  toggleLinkedTasksInSourceExpansionUi,
} = taskListsSlice.actions;

/** potentially useful
function sourceFromId(
  id: string,
  settingsSources: Array<SourceInternal>
): SourceInternal | undefined {
  return R.find((source) => source.id === id, settingsSources);
}
* */

export function isTaskyamlUriScheme(sourceId: string) {
  return isGlobalUri(sourceId) && globalUriScheme(sourceId) === TASKYAML_SCHEME;
}

/**
 * return the value for the given label if in the summary; otherwise, null
 */
export function labelValueInSummary(
  label: string,
  summary: string
): string | null {
  const pairs = R.filter(R.test(/\S:\S/), R.split(' ', summary));
  const pair = R.find((str) => str.startsWith(`${label}:`), pairs);
  return pair ? R.splitAt(pair.indexOf(':') + 1, pair)[1] : null;
}

/**
 * return true if the given label is in the summary; otherwise, false
 */
export function hasLabelInSummary(label: string, summary: string): boolean {
  return summary.startsWith(`${label}:`) || summary.indexOf(` ${label}:`) > -1;
}

// return values for all instances of that label; always some array, even if empty
function getLabelValues(label: string, summary: string): Array<string> {
  let result: Array<string> = [];
  const parts = summary.split(`${label}:`);
  // start at the second value and find all the values
  for (let i = 1; i < parts.length; i += 1) {
    const value = parts[i].trim();
    if (value) {
      let spacePos = value.indexOf(' ');
      if (spacePos === -1) {
        spacePos = value.length;
      }
      result = R.append(value.substring(0, spacePos), result);
    }
  }
  return result;
}

export const getIdValues = R.curry(getLabelValues)(ID_LABEL_KEY);
export const getRefValues = R.curry(getLabelValues)(REF_LABEL_KEY);

export function taskFromString(
  sourceId: string,
  fullText: string,
  dependents: Array<YamlTask>,
  subtasks: Array<YamlTask>
) {
  let priority = NaN;
  let estimate = NaN;
  let remainingText = fullText.trim();
  let space1Pos = remainingText.indexOf(' ');
  if (space1Pos > -1 || (space1Pos === -1 && remainingText.length > 0)) {
    // there's a space or a bunch of characters
    if (space1Pos === -1) {
      // no spaces at all; still check if it's just a number
      space1Pos = remainingText.length;
    }
    const firstNumber = parseFloat(remainingText.substring(0, space1Pos));
    if (Number.isNaN(firstNumber)) {
      // there's no number at all; it's all a summary
    } else {
      // it's a number, either priority or estimate
      remainingText = remainingText.substring(space1Pos + 1);
      let space2Pos = remainingText.indexOf(' ');
      if (space2Pos > -1 || (space2Pos === -1 && remainingText.length > 0)) {
        // there's a space or a bunch of characters
        if (space2Pos === -1) {
          // no spaces left; still check if it's just a number
          space2Pos = remainingText.length;
        }
        const secondNumber = parseFloat(remainingText.substring(0, space2Pos));
        if (Number.isNaN(secondNumber)) {
          // there's no second number, so the first number must be the estimate
          estimate = firstNumber;
        } else {
          // there is a second number
          priority = firstNumber;
          estimate = secondNumber;
          remainingText = remainingText.substring(space2Pos + 1);
        }
      } else {
        // there's no more space or characters, so it must just be an estimate number
        estimate = firstNumber;
      }
    }
  }
  return {
    sourceId,
    priority,
    estimate,
    summary: remainingText,
    dependents,
    subtasks,
  };
}

type YamlInputIssues =
  | string
  | { [key: string]: YamlInputIssues }
  | Array<YamlInputIssues>;

/**
 * @param sourceId the source ID, an integral datum in every task
 * @param issueList is some part of the recursive task string or list
 */
const parseYamlIssues = (
  sourceId: string,
  issueList: YamlInputIssues
): YamlTask | Array<YamlTask> => {
  if (Array.isArray(issueList)) {
    // I don't expect to see arrays of arrays (outside blockers or subtasks).
    // This helps with typechecks... hope it doesn't do anything unexpected.
    return issueList.map((issue) => parseYamlIssues(sourceId, issue)).flat();
  }
  if (typeof issueList === 'string') {
    return taskFromString(sourceId, issueList, [], []);
  }
  if (typeof issueList === 'object') {
    // If null, I don't know what that means.
    if (issueList === null) {
      return {
        sourceId,
        priority: null,
        estimate: null,
        summary: `(null)`,
        dependents: [],
        subtasks: [],
      };
    }

    const issueObj = issueList;

    // If there's a single key, it must be the summary.
    // If there are more, the summary is whichever has a value "null".
    // (It's the first key, but some parsers don't put it first in JSON.)
    const keys = Object.keys(issueObj);
    let summary = '';
    let dependents: Array<YamlTask> = [];
    let subtasks: Array<YamlTask> = [];
    if (keys.length === 1) {
      // it must be a summary, with subtasks as values
      summary = Object.keys(issueObj)[0].toString();
      const tempSubtasks = parseYamlIssues(sourceId, issueObj[summary]);
      if (Array.isArray(tempSubtasks)) {
        subtasks = tempSubtasks;
      } else {
        subtasks = [tempSubtasks];
      }
    } else {
      /* eslint-disable @typescript-eslint/dot-notation */
      // There are many keys.  Assume any with value of null is the summary
      for (let i = 0; !summary && i < keys.length; i += 1) {
        if (issueObj[keys[i]] === null) {
          summary = keys[i];
        }
      }
      // ... but override that if there's something explicit
      if (issueObj['summary']) {
        summary = issueObj['summary'].toString();
      }
      // doing this because our YamlTask interface doesn't include an ID, so it'll be parsed out later
      if (issueObj['id']) {
        summary += ` id:${issueObj['id'].toString().replace(/\s/g, '_')}`;
      }
      if (issueObj['blocks']) {
        const tempDependents = parseYamlIssues(sourceId, issueObj['blocks']);
        if (Array.isArray(tempDependents)) {
          dependents = tempDependents;
        } else {
          dependents = [tempDependents];
        }
      }
      if (issueObj['subtasks']) {
        const tempSubtasks = parseYamlIssues(sourceId, issueObj['subtasks']);
        if (Array.isArray(tempSubtasks)) {
          subtasks = tempSubtasks;
        } else {
          subtasks = [tempSubtasks];
        }
      }
      /* eslint-enable @typescript-eslint/dot-notation */
    }

    return taskFromString(sourceId, summary, dependents, subtasks);
  }
  return {
    sourceId,
    priority: null,
    estimate: null,
    summary: `Unknown YamlTask Structure: ${typeof issueList} ${issueList}`,
    dependents: [],
    subtasks: [],
  };
};

function isInputIssueArray(
  contents: unknown
): contents is Array<YamlInputIssues> {
  return (
    typeof contents !== 'undefined' &&
    typeof contents !== 'string' &&
    (contents as Array<YamlInputIssues>).length > 0
  );
}

function isProjectFile(contents: unknown): contents is ProjectFile {
  return (
    typeof contents !== 'undefined' &&
    typeof contents !== 'string' &&
    (contents as ProjectFile).tasks !== undefined
  );
}

/**
 * @return a Promise that resolves to arrays of YamlTasks
 */
async function retrieveTasksFromSource(
  sourceId: string,
  distnet: DistnetState
): Promise<Array<YamlTask>> {
  try {
    const { contents } = distnet.cache[sourceId];
    if (!contents) {
      return [];
    }
    const contentTasks = yaml.safeLoad(contents);
    let taskList: Array<YamlInputIssues>;
    if (isInputIssueArray(contentTasks)) {
      taskList = contentTasks;
    } else if (isProjectFile(contentTasks)) {
      taskList = contentTasks.tasks;
    } else {
      console.error('Failure getting array or .tasks from file', sourceId);
      return [];
    }
    const issues = parseYamlIssues(sourceId, taskList);
    if (Array.isArray(issues)) {
      return issues;
    }
    return [issues];
  } catch (e) {
    console.error('Failure loading tasks from source', sourceId, e);
    return [];
  }
}

/**
 * @return a Promise that resolves to arrays of arrays of YamlTasks
 */
async function retrieveAllTasksFromSources(
  distnet: DistnetState
): Promise<Array<Array<YamlTask>>> {
  let result: Array<Promise<Array<YamlTask>>> = [];
  const cacheValues: Array<CacheData> = R.values(distnet.cache);
  if (cacheValues) {
    for (let i = 0; i < cacheValues.length; i += 1) {
      const entry = cacheValues[i];
      if (entry.sourceId && isTaskyamlUriScheme(entry.sourceId)) {
        const next = retrieveTasksFromSource(entry.sourceId, distnet);
        result = R.concat(result, [next]);
      }
    }
  }
  return Promise.all(result);
}

function idOrNestedId(summary: string, prefix: string, index: number): string {
  let id = labelValueInSummary('id', summary);
  if (id === null) {
    id = prefix + index;
  }
  return id;
}

/**
 * Create a mapping with all tasks indexed by keys.
 * This modifies 'master' to contain all the issues.
 * This will be used to fill in all the references.
 */
function createMasterTaskList(
  master: Record<string, IssueToSchedule>,
  tasks: Array<IssueToSchedule>
): void {
  for (let i = 0; i < tasks.length; i += 1) {
    master[tasks[i].key] = tasks[i];
    createMasterTaskList(master, tasks[i].dependents);
    createMasterTaskList(master, tasks[i].subtasks);
  }
}

/**
 * This translates each YamlTask into an issue for the forecast, with the same dependent/subtask structure.
 */
function createForecastTasksRaw(
  tasks: Array<YamlTask>,
  prefix: string
): Array<IssueToSchedule> {
  return tasks.map((t, i) => {
    const id = idOrNestedId(t.summary, prefix, i);
    const result = {
      key: id,
      summary: t.summary,
      priority: Number.isNaN(t.priority) ? 0 : t.priority,
      issueEstSecondsRaw: Math.round(t.estimate * 60 * 60),
      dueDate: labelValueInSummary('due', t.summary),
      mustStartOnDate: labelValueInSummary('mustStartOnDate', t.summary),
      dependents: createForecastTasksRaw(t.dependents, `${prefix + id}_d-`),
      subtasks: createForecastTasksRaw(t.subtasks, `${prefix + id}_s-`),
    };
    return result;
  });
}

function createForecastTasks(tasks: Array<YamlTask>): Array<IssueToSchedule> {
  let rawTrees: Array<IssueToSchedule> = createForecastTasksRaw(tasks, '');
  const masterMap: Record<string, IssueToSchedule> = {};
  createMasterTaskList(masterMap, rawTrees);
  // now use master as a reference to fill in 'ref' references until they're all gone
  let changed;
  do {
    changed = false;
    const keys = Object.keys(masterMap);
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      const issue = masterMap[keys[keyIndex]];
      for (let depi = 0; depi < issue.dependents.length; depi += 1) {
        const depRef = labelValueInSummary(
          REF_LABEL_KEY,
          issue.dependents[depi].summary
        );
        if (depRef !== null && masterMap[depRef]) {
          issue.dependents[depi] = masterMap[depRef];
          changed = true;
          // remove from the top-level issues (to lesson duplication when sending)
          rawTrees = R.reject((iss) => iss.key === depRef, rawTrees);
        }
      }
      for (let subi = 0; subi < issue.subtasks.length; subi += 1) {
        const subRef = labelValueInSummary(
          REF_LABEL_KEY,
          issue.subtasks[subi].summary
        );
        if (subRef !== null && masterMap[subRef]) {
          issue.subtasks[subi] = masterMap[subRef];
          changed = true;
          // remove from the top-level issues (to lesson duplication when sending)
          rawTrees = R.reject((iss) => iss.key === subRef, rawTrees);
        }
      }
    }
  } while (changed);
  // return R.values(masterMap); // useful for debugging since all tasks are at the top (though it sends much more data)
  return rawTrees;
}

export const retrieveForecast = (
  sourceId: string,
  hoursPerWeek: number,
  focusOnTask: string
): AppThunk => async (dispatch, getState) => {
  const tasks = getState().taskLists.allLists[sourceId];
  const issues: Array<IssueToSchedule> = createForecastTasks(tasks);
  const createPreferences = {
    defaultAssigneeHoursPerWeek: hoursPerWeek,
    reversePriority: true,
  };
  const showIssues = focusOnTask ? [focusOnTask] : undefined;
  const displayPreferences = {
    embedJiraLinks: false,
    showBlocked: true,
    showDependenciesInSeparateColumns: true,
    showHierarchically: true,
    showIssues,
  };
  const forecastRequest = {
    issues,
    createPreferences,
    displayPreferences,
  };
  const urlString = `${DEFAULT_FORECAST_SERVER}/display`;
  fetch(urlString, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(forecastRequest),
  })
    .then((forecastResponse) => {
      // Lint complains about nested promises but I don't know a better way to use the response body for either success or error.
      // eslint-disable-next-line promise/no-nesting
      return forecastResponse.text().then((forecastString) => {
        if (!forecastResponse.ok) {
          // eslint-disable-next-line max-len
          throw new Error(
            `Failed to get forecast from ${urlString}, with response code ${forecastResponse.status}. ${forecastString}`
          );
        } else {
          return forecastString;
        }
      });
    })
    .then((forecastString) => {
      return dispatch(
        setForecastData({
          focusIssueId: focusOnTask,
          hoursPerWeek,
          html: forecastString,
          sourceId,
        })
      );
    })
    .catch((err) => {
      console.error('Got error retrieving forecast.', err);
      // eslint-disable-next-line no-new
      new Notification('Error', {
        body: `Got an error trying to retrieve the forecast.`,
        silent: true,
      });
    });
};

export const dispatchToggleSubtaskExpansionUi = (
  sourceId: string,
  uiTreePath: Array<UiTreeBranch>,
  allUiTrees: Record<string, Array<UiTree>>
): AppThunk => async (dispatch) => {
  dispatch(
    toggleLinkedTasksInSourceExpansionUi({
      property: UiTreeProperty.SUBTASKS_EXP,
      linkage: UiTreeLinkageProperty.SUBTASKS,
      sourceId,
      uiTreePath,
      allUiTrees,
    })
  );
};

export const dispatchToggleDependentExpansionUi = (
  sourceId: string,
  uiTreePath: Array<UiTreeBranch>,
  allUiTrees: Record<string, Array<UiTree>>
): AppThunk => async (dispatch) => {
  dispatch(
    toggleLinkedTasksInSourceExpansionUi({
      property: UiTreeProperty.DEPENDENTS_EXP,
      linkage: UiTreeLinkageProperty.DEPENDENTS,
      sourceId,
      uiTreePath,
      allUiTrees,
    })
  );
};

export const dispatchLoadOneSourceIntoTasks = (
  sourceId: string
): AppThunk => async (dispatch, getState) => {
  await dispatch(dispatchReloadCacheForFile(sourceId));
  const taskList: Array<YamlTask> = await retrieveTasksFromSource(
    sourceId,
    getState().distnet
  );
  await dispatch(setTaskList({ sourceId, taskList }));
  return dispatch(
    setUiForPath({
      sourceId,
      uiTreeList: taskList.map(uiTreeFromYamlTask),
    })
  );
};

export const dispatchLoadAllSourcesIntoTasks = (): AppThunk => async (
  dispatch,
  getState
) => {
  const newTasks: Array<Array<YamlTask>> = await retrieveAllTasksFromSources(
    getState().distnet
  );
  await dispatch(setAllTaskLists(newTasks));

  const uiTreePathKeys = R.keys(getState().taskLists.allLists);
  const uiTreePathVals = R.values(getState().taskLists.allLists).map((tl) =>
    tl.map(uiTreeFromYamlTask)
  );
  for (let i = 0; i < uiTreePathKeys.length; i += 1) {
    dispatch(
      setUiForPath({
        sourceId: uiTreePathKeys[i],
        uiTreeList: uiTreePathVals[i],
      })
    );
  }
};

/**
 * unused
 *
export const dispatchLoadAllTaskListsIfEmpty = (): AppThunk => async (
  dispatch,
  getState
) => {
  if (R.keys(getState().taskLists.allLists).length === 0) {
    dispatch(dispatchLoadAllSourcesIntoTasks());
  }
  ... and then do something about the UiTrees for the UI
};
 *
 */

/**
 * unused
 *
function saveToFile(
  file: string,
  text: string
): Promise<void> {
  return fsPromises.writeFile(file, text).catch((err) => {
    console.error('Error saving to file:', err);
    throw Error(
      `Error saving to file: ${err} ... with err.toString() ${err.toString()}`
    );
  });
}
 *
 */

function appendToFile(file: string, text: string): Promise<void> {
  return fsPromises.appendFile(file, text).catch((err) => {
    console.error('Error saving to file:', err);
    throw Error(
      `Error saving to file: ${err} ... with err.toString() ${err.toString()}`
    );
  });
}

function localLogFileName(filename: string) {
  const parsed = path.parse(filename);
  const containingDir = parsed.dir;
  const finalLogFile = `.${parsed.base}.log.yml`;
  return path.join(containingDir, finalLogFile);
}

export const dispatchLogMessage = (
  task: YamlTask,
  comment: string,
  keyPassword: string
): AppThunk => async (_1, getState) => {
  try {
    if (getState().distnet.settings.credentials) {
      const keyContents = R.find(
        (c) => c.id === 'privateKey',
        getState().distnet.settings.credentials
      );
      if (
        keyContents &&
        keyContents.encryptedPkcs8PemPrivateKey &&
        keyContents.ivBase64
      ) {
        // figure out how to push out the message
        const source = R.find(
          (s) => s.id === task.sourceId,
          getState().distnet.settings.sources
        );
        if (
          source &&
          isFileUrl(source.workUrl) &&
          getState().distnet.cache &&
          getState().distnet.cache[task.sourceId] &&
          getState().distnet.cache[task.sourceId].contents
        ) {
          const taskId = labelValueInSummary(ID_LABEL_KEY, task.summary);

          if (R.isNil(taskId)) {
            alert(
              `Cannot log work for a task without an ID.` +
                `  Edit the task and add a unique "${ID_LABEL_KEY}:SOME_VALUE"` +
                ` in the summary.`
            );
          } else {
            // sign
            const sign = nodeCrypto.createSign('SHA256');
            const messageForSigning: MessageForSigning = {
              comment,
              did: '', // doing this so that it's in the right order if used
              summary: task.summary,
              taskUri: globalUriForId(taskId, task.sourceId),
              time: new Date().toISOString(),
            };
            if (keyContents.did) {
              messageForSigning.did = keyContents.did;
            } else {
              delete messageForSigning.did;
            }
            sign.write(JSON.stringify(messageForSigning));
            sign.end();
            const keyPem: string = decryptFromBase64(
              keyContents.encryptedPkcs8PemPrivateKey,
              keyPassword,
              keyContents.salt || '',
              keyContents.ivBase64
            );
            const privateKey = nodeCrypto.createPrivateKey(keyPem);
            const publicKeyEncoded = nodeCrypto
              .createPublicKey(keyPem)
              .export({ type: 'spki', format: 'pem' })
              .toString();

            const signature = sign.sign(privateKey, 'hex');

            const newLog: Log = {
              id: uuid.v4(),
              taskId,
              data: { messageData: messageForSigning },
              time: messageForSigning.time,
              publicKey: publicKeyEncoded,
              signature,
            };
            // since the field order doesn't matter here, we'll throw it onto the end
            if (keyContents.did) {
              newLog.did = keyContents.did;
            }
            const logYaml: string = yaml.safeDump(newLog);
            // eslint-disable-next-line prefer-template
            const logText = '\n- ' + logYaml.replace(/\n/g, '\n  ');
            const filename = url.fileURLToPath(source.workUrl);
            const logFilename = localLogFileName(filename);
            appendToFile(logFilename, logText)
              // eslint-disable-next-line promise/always-return
              .then(() => {
                console.log('Successfully saved message to', logFilename);
                // eslint-disable-next-line no-new
                new Notification('Saved', {
                  body: `Successfully saved message to ${logFilename}`,
                });
              })
              .catch((err) => {
                console.log(
                  'Failed to save message to file',
                  logFilename,
                  'because',
                  err
                );
                alert(
                  `Failed to save message to file ${logFilename} because ${err}`
                );
              });
          }
        } else {
          console.log('I do not know how to log work for this task:', task);
          alert(
            `I don't know how to log work for this task: ${JSON.stringify(task)}` // eslint-disable-line max-len,prettier/prettier
          );
        }
      } else {
        alert(
          'You have not set a "credentials" with ID "privateKey" and an "encryptedPkcs8PemPrivateKey" value in your settings, which is necessary to submit a task.  To fix, go to the settings and click "Generate Key".' // eslint-disable-line max-len
        );
      }
    } else {
      alert(
        'You have not put any "credentials" in your settings.  To fix, go to the settings and click "Generate Key".'
      );
    }
  } catch (e) {
    console.log('Something went wrong signing and logging a message.', e);
    alert('Something went wrong! See the dev console for details.');
  }
};

// return map of issue key & number of references
const referencedTaskCounts = (
  listKey: string,
  tasks: Array<YamlTask>
): Record<string, number> => {
  const result: Record<string, number> = {};
  for (let i = 0; i < tasks.length; i += 1) {
    const refs = getRefValues(tasks[i].summary);
    for (let j = 0; j < refs.length; j += 1) {
      const key = globalUriForId(refs[j], listKey);
      result[key] = 1 + (result[key] || 0);
    }
  }
  return result;
};

// only exporting so that we can run tests
export const aggregateReferencedTaskCounts = (
  allTasks: Record<string, Array<YamlTask>>
): Record<string, number> => {
  const keys = R.keys(allTasks);
  const countRecords = keys.map((key) =>
    referencedTaskCounts(key, allTasks[key])
  );
  return R.reduce(R.curry(R.mergeWith(R.add)), {}, countRecords);
};

// only exporting so that we can run tests
export const sortedReferencedTasks = (
  allTasks: Record<string, Array<YamlTask>>
): [string, number][] => {
  const aggregated = aggregateReferencedTaskCounts(allTasks);
  const pairs: [string, number][] = R.toPairs(aggregated);
  return R.reverse(R.sortBy(R.view(R.lensIndex(1)), pairs));
};

export const dispatchDetermineTopTasks = (): AppThunk => async (
  dispatch,
  getState
) => {
  const linked = sortedReferencedTasks(getState().taskLists.allLists);
  return dispatch(setTopLinkedInfo(linked));
};

export default taskListsSlice.reducer;
