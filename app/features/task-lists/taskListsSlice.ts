import { createSlice } from '@reduxjs/toolkit';
import fs from 'fs';
import * as R from 'ramda';
import yaml from 'js-yaml';
import url from 'url';
import nodeCrypto from 'crypto';
import * as uuid from 'uuid';
// eslint-disable-next-line import/no-cycle
import { AppThunk } from '../../store';
import {
  CacheData,
  DistnetState,
  Payload,
  WriteMethod,
} from '../distnet/distnetClasses';
import {
  isGlobalUri,
  globalUriForId,
  globalUriScheme,
} from '../distnet/uriTools';
// eslint-disable-next-line import/no-cycle
import { dispatchReloadCacheForId } from '../distnet/distnetSlice';

const TASKYAML_SCHEME = 'taskyaml';

const fsPromises = fs.promises;

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

// Remember to keep these in alphabetical order for standard.
interface VolunteerMessageForSigning {
  summary: string;
  did?: string;
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
  sourceId: string;
  html: string;
}

interface IdAndTaskList {
  sourceId: string;
  taskList: Array<YamlTask>;
}

const taskListsSlice = createSlice({
  name: 'taskLists',
  initialState: {
    allLists: {} as Record<string, Array<YamlTask>>,
    forecastData: { sourceId: '', html: '' } as ForecastData,
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
    clearForecastData: (state) => {
      state.forecastData = { sourceId: '', html: '' };
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
} = taskListsSlice.actions;

/** potentially useful
function sourceFromId(
  id: string,
  settingsSources: Array<Source>
): Source | undefined {
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
    const contentTasks = yaml.safeLoad(distnet.cache[sourceId].contents);
    let taskList: Array<YamlInputIssues>;
    if (isInputIssueArray(contentTasks)) {
      taskList = contentTasks;
    } else if (isProjectFile(contentTasks)) {
      taskList = contentTasks.tasks;
    } else {
      console.error('Failure getting array or .tasks from source', sourceId);
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
      if (isTaskyamlUriScheme(entry.sourceId)) {
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
      issueEstSecondsRaw:
        t.estimate === null ? null : 2 ** t.estimate * 60 * 60,
      dueDate: labelValueInSummary('due', t.summary),
      mustStartOnDate: labelValueInSummary('mustStartOnDate', t.summary),
      dependents: createForecastTasksRaw(t.dependents, `${prefix + id}_d-`),
      subtasks: createForecastTasksRaw(t.subtasks, `${prefix + id}_s-`),
    };
    return result;
  });
}

const REF_KEY = 'ref';

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
          REF_KEY,
          issue.dependents[depi].summary
        );
        if (depRef !== null
            && masterMap[depRef]) {
          issue.dependents[depi] = masterMap[depRef];
          changed = true;
          // remove from the top-level issues (to lesson duplication when sending)
          rawTrees = R.reject((iss) => iss.key === depRef, rawTrees);
        }
      }
      for (let subi = 0; subi < issue.subtasks.length; subi += 1) {
        const subRef = labelValueInSummary(
          REF_KEY,
          issue.subtasks[subi].summary
        );
        if (subRef !== null
            && masterMap[subRef]) {
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
  const urlString = 'http://localhost:8090/display';
  fetch(urlString, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(forecastRequest),
  })
    .then((forecastResponse) => {
      if (!forecastResponse.ok) {
        throw Error(
          `Failed to get forecast from ${urlString} due to response code ${forecastResponse.status}`
        );
      }
      return forecastResponse.text();
    })
    .then((forecastString) => {
      return dispatch(setForecastData({ sourceId, html: forecastString }));
    })
    .catch((err) => {
      console.error(
        "Got error retrieving forecast.  Maybe that service isn't running.",
        err
      );
      throw err;
    });
};

export const dispatchLoadOneSourceIntoTasks = (
  sourceId: string
): AppThunk => async (dispatch, getState) => {
  await dispatch(dispatchReloadCacheForId(sourceId));
  const result: Array<YamlTask> = await retrieveTasksFromSource(
    sourceId,
    getState().distnet
  );
  return dispatch(setTaskList({ sourceId, taskList: result }));
};

export const dispatchLoadAllSourcesIntoTasks = (): AppThunk => async (
  dispatch,
  getState
) => {
  const result: Array<Array<YamlTask>> = await retrieveAllTasksFromSources(
    getState().distnet
  );
  return dispatch(setAllTaskLists(result));
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
};
 *
 */

function saveToFile(
  file: string,
  text: string
): Promise<void | { error: string }> {
  return fsPromises.writeFile(file, text).catch((err) => {
    console.error('Error saving to file:', err);
    throw Error(
      `Error saving to file: ${err} ... with err.toString() ${err.toString()}`
    );
  });
}

export const dispatchVolunteer = (task: YamlTask): AppThunk => async (
  _1,
  getState
) => {
  if (getState().distnet.settings.credentials) {
    const keyContents = R.find(
      (c) => c.id === 'privateKey',
      getState().distnet.settings.credentials
    );
    if (keyContents && keyContents.privateKeyPkcs8Pem) {
      // figure out how to push out the message
      const source = R.find(
        (s) => s.id === task.sourceId,
        getState().distnet.settings.sources
      );
      if (
        source &&
        source.urls &&
        source.urls.length > 0 &&
        getState().distnet.cache &&
        getState().distnet.cache[task.sourceId] &&
        getState().distnet.cache[task.sourceId].contents
      ) {
        const taskId = labelValueInSummary('id', task.summary);

        if (R.isNil(taskId)) {
          alert(
            'Cannot volunteer for a task without an ID.' +
              '  Edit the task and add a unique "id:SOME_VALUE" in the summary.'
          );
        } else {
          // sign
          const sign = nodeCrypto.createSign('SHA256');
          const volunteerMessageForSigning: VolunteerMessageForSigning = {
            summary: task.summary,
            taskUri: globalUriForId(taskId, task.sourceId),
            time: new Date().toISOString(),
          };
          if (keyContents.did) {
            volunteerMessageForSigning.did = keyContents.did;
          }
          sign.write(JSON.stringify(volunteerMessageForSigning));
          sign.end();
          const keyPem: string = keyContents.privateKeyPkcs8Pem;
          const privateKey = nodeCrypto.createPrivateKey(keyPem);
          const publicKeyEncoded = nodeCrypto
            .createPublicKey(keyPem)
            .export({ type: 'spki', format: 'pem' })
            .toString();

          const signature = sign.sign(privateKey, 'hex');

          const fileContents = yaml.safeLoad(
            getState().distnet.cache[task.sourceId].contents
          );
          let projectContents: ProjectFile;
          if (isInputIssueArray(fileContents)) {
            // this changes the format to put the array under the "tasks" key
            projectContents = { tasks: fileContents };
          } else if (isProjectFile(fileContents)) {
            projectContents = fileContents;
          } else {
            console.log(
              'Failed to load array or .tasks from source',
              task.sourceId
            );
            alert(
              `Failed to load array or .tasks from source ${task.sourceId}`
            );
            return;
          }
          for (let i = 0; projectContents && i < source.urls.length; i += 1) {
            // now find where to write the task
            if (source.urls[i].writeMethod === WriteMethod.DIRECT_TO_FILE) {
              const newLog: Log = {
                id: uuid.v4(),
                taskId,
                data: { messageData: volunteerMessageForSigning },
                time: volunteerMessageForSigning.time,
                publicKey: publicKeyEncoded,
                signature,
              };
              if (volunteerMessageForSigning.did) {
                newLog.did = volunteerMessageForSigning.did;
              }
              projectContents.log = R.concat(
                [newLog],
                projectContents.log || []
              );
              const projectYamlString = yaml.safeDump(projectContents);
              saveToFile(
                url.fileURLToPath(source.urls[i].url),
                projectYamlString
              )
                .then(() => {
                  console.log(
                    'Successfully saved task',
                    taskId,
                    'to file',
                    source.urls[i].url
                  );
                  return true;
                })
                .catch((err) => {
                  console.log(
                    'Failed to save task',
                    taskId,
                    'to file',
                    source.urls[i].url,
                    'because',
                    err
                  );
                });
            } else {
              console.log(
                'I do not know how to save task',
                taskId,
                '... to this URL',
                source.urls[i]
              );
            }
          }
        }
      } else {
        console.log('I do not know how to save this task info anywhere:', task);
        alert(
          `I don't know how to save this task info anywhere: ${JSON.stringify(
            task
          )}`
        );
      }
    } else {
      alert(
        'You have not set a "privateKey" in your settings, which is necessary' +
          ' to submit a task.  To fix, go to the settings and click' +
          ' "Generate Key".'
      );
    }
  }
};

export default taskListsSlice.reducer;
