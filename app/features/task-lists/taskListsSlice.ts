import { createSlice } from '@reduxjs/toolkit';
import fs from 'fs';
import _ from 'lodash';
import * as R from 'ramda';
import yaml from 'js-yaml';
import url from 'url';
import nodeCrypto from 'crypto';
import * as uuid from 'uuid';
// eslint-disable-next-line import/no-cycle
import { AppThunk } from '../../store';
import {
  Cache,
  CacheData,
  Payload,
  WriteMethod,
} from '../distnet/distnetClasses';
import { globalUriForId } from '../distnet/uriTools';

const fsPromises = fs.promises;

export interface ProjectFile {
  tasks: Array<InputIssues>;
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

export interface Task {
  sourceId: string;
  priority: number | null;
  estimate: number | null;
  description: string;
  dependents: Array<Task>;
  subtasks: Array<Task>;
}

// Remember to keep these in alphabetical order for standard.
interface VolunteerMessageForSigning {
  description: string;
  did?: string;
  taskUri: string;
  time: string;
}

interface IssueToSchedule {
  key: string;
  summary: string;
  // number of seconds
  issueEstSecondsRaw: number;
  dueDate: string;
}

const taskListsSlice = createSlice({
  name: 'taskLists',
  initialState: { bigList: [] as Array<Task>, forecastHtml: '' as string },
  reducers: {
    setTaskList: (state, tasks: Payload<Array<Task>>) => {
      state.bigList = tasks.payload;
    },
    addTaskList: (state, tasks: Payload<Array<Task>>) => {
      state.bigList = state.bigList.concat(tasks.payload);
    },
    setForecastHtml: (state, html: Payload<string>) => {
      state.forecastHtml = html.payload;
    },
  },
});

export const {
  setTaskList,
  addTaskList,
  setForecastHtml,
} = taskListsSlice.actions;

/** potentially useful
function sourceFromId(
  id: string,
  settingsSources: Array<Source>
): Source | undefined {
  return _.find(settingsSources, (source) => source.id === id);
}
* */

export function isTaskyamlSource(sourceId: string) {
  return sourceId.startsWith('taskyaml:');
}

/**
 * return the value for the given label if in the description; otherwise, null
 */
export function labelValueInDescription(label: string, description: string) {
  const pairs = R.filter(R.test(/:/), R.split(' ', description));
  const pair = R.find((str) => str.startsWith(`${label}:`), pairs);
  return pair ? R.splitAt(pair.indexOf(':') + 1, pair)[1] : null;
}

export function taskFromString(
  sourceId: string,
  fullText: string,
  dependents: Array<Task>,
  subtasks: Array<Task>
) {
  let priority = NaN;
  let estimate = NaN;
  let remainingText = fullText.trim();
  let space1Pos = remainingText.indexOf(' ');
  if (space1Pos > -1 || (space1Pos === -1 && remainingText.length > 0)) {
    if (space1Pos === -1) {
      // no spaces at all; still check if it's just a number
      space1Pos = remainingText.length;
    }
    priority = parseFloat(remainingText.substring(0, space1Pos));
    if (!Number.isNaN(priority)) {
      remainingText = remainingText.substring(space1Pos + 1);
      let space2Pos = remainingText.indexOf(' ');
      if (space2Pos > -1 || (space2Pos === -1 && remainingText.length > 0)) {
        if (space2Pos === -1) {
          // no spaces left; still check if it's just a number
          space2Pos = remainingText.length;
        }
        estimate = parseFloat(remainingText.substring(0, space2Pos));
        if (!Number.isNaN(estimate)) {
          remainingText = remainingText.substring(space2Pos + 1);
        }
      }
    }
  }
  return {
    sourceId,
    priority,
    estimate,
    description: remainingText,
    dependents,
    subtasks,
  };
}

type InputIssues = string | { [key: string]: InputIssues } | Array<InputIssues>;

/**
 * @param sourceId the source ID, an integral datum in every task
 * @param issueList is some part of the recursive task string or list
 */
const parseIssues = (
  sourceId: string,
  issueList: InputIssues
): Task | Array<Task> => {
  if (Array.isArray(issueList)) {
    // I don't expect to see arrays of arrays (outside blockers or subtasks).
    // This helps with typechecks... hope it doesn't do anything unexpected.
    return issueList.map((issue) => parseIssues(sourceId, issue)).flat();
  }
  if (typeof issueList === 'string') {
    return taskFromString(sourceId, issueList, [], []);
  }
  if (typeof issueList === 'object') {
    // expecting a key of the issue with value the subtasks issues
    const key = Object.keys(issueList)[0].toString();

    if (issueList.issues) {
      // This must be the top level.  Load the array.
      return parseIssues(sourceId, issueList.issues);
    }

    // Except for the top level, the value of the object should always be a list.
    // Each value of the list is either a string (a standalone task)
    // or an object where the key may be:
    //   - a word "subtasks", "supertasks", "blocks", or "awaits"
    //   - a task descriptions
    // ... and the value is another task list.

    const subSubtasks = parseIssues(sourceId, issueList[key]);
    let subtasks = [];
    if (Array.isArray(subSubtasks)) {
      subtasks = subSubtasks;
    } else {
      subtasks = [subSubtasks];
    }
    return taskFromString(sourceId, key, [], subtasks);
  }
  return {
    sourceId,
    priority: null,
    estimate: null,
    description: `Unknown Task Structure: ${typeof issueList} ${issueList}`,
    dependents: [],
    subtasks: [],
  };
};

function isInputIssueArray(contents: unknown): contents is Array<InputIssues> {
  return (
    typeof contents !== 'undefined' &&
    typeof contents !== 'string' &&
    (contents as Array<InputIssues>).length > 0
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
 * @return a Promise that resolves to arrays of arrays of Tasks
 */
async function retrieveAllTasks(
  cacheSources: Cache
): Promise<Array<Array<Task>>> {
  let result: Array<Promise<Array<Task>>> = [];
  const cacheValues: Array<CacheData> = _.values(cacheSources);
  if (cacheValues) {
    for (let i = 0; i < cacheValues.length; i += 1) {
      const entry = cacheValues[i];
      if (isTaskyamlSource(entry.sourceId)) {
        const next: Promise<Array<Task>> = fsPromises
          .readFile(entry.localFile)
          .then((resp) => resp.toString())
          .then((contents) => {
            const contentTasks = yaml.safeLoad(contents);
            let taskList: Array<InputIssues>;
            if (isInputIssueArray(contentTasks)) {
              taskList = contentTasks;
            } else if (isProjectFile(contentTasks)) {
              taskList = contentTasks.tasks;
            } else {
              console.error(
                'Failure getting array or .tasks from source',
                entry.sourceId
              );
              return [];
            }
            const issues = parseIssues(entry.sourceId, taskList);
            if (Array.isArray(issues)) {
              return issues;
            }
            return [issues];
          })
          .catch((error) => {
            console.error(
              'Failure loading a YAML task list from source',
              entry.sourceId,
              ' ... with error',
              error
            );
            return [];
          });
        result = _.concat(result, next);
      }
    }
  }
  return Promise.all(result);
}

export const retrieveForecast = (
  sourceId: string,
  hoursPerWeek: number
): AppThunk => async (dispatch, getState) => {
  const tasks = _.filter(
    getState().taskLists.bigList,
    (task) => task.sourceId === sourceId
  );
  const forecastTasks: Array<IssueToSchedule> = tasks.map((t, i) => ({
    key: i.toString(),
    summary: t.description,
    priority: t.priority,
    issueEstSecondsRaw: t.estimate === null ? 0 : 2 ** t.estimate * 60 * 60,
    dueDate: labelValueInDescription("due", t.description),
  }));
  const forecastRequest = {
    issues: forecastTasks,
    createPreferences: {
      defaultAssigneeHoursPerWeek: hoursPerWeek,
      reversePriority: true,
    },
  };
  const forecastResponse = await fetch('http://localhost:8090/display', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(forecastRequest),
  });
  const forecastString = await forecastResponse.text();
  return dispatch(setForecastHtml(forecastString));
};

export const dispatchLoadAllSourcesIntoTasks = (): AppThunk => async (
  dispatch,
  getState
) => {
  const result: Array<Array<Task>> = await retrieveAllTasks(
    getState().distnet.cache
  );
  return dispatch(setTaskList(_.compact(_.flattenDeep(result))));
};

/**
 * unused
 *
export const dispatchLoadAllTaskListsIfEmpty = (): AppThunk => async (
  dispatch,
  getState
) => {
  if (getState().taskLists.bigList.length === 0) {
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

export const dispatchVolunteer = (task: Task): AppThunk => async (
  _1,
  getState
) => {
  if (getState().distnet.settings.credentials) {
    const keyContents = _.find(
      getState().distnet.settings.credentials,
      (c) => c.id === 'privateKey'
    );
    if (keyContents && keyContents.privateKeyPkcs8Pem) {
      // figure out how to push out the message
      const source = _.find(
        getState().distnet.settings.sources,
        (s) => s.id === task.sourceId
      );
      if (
        source &&
        source.urls &&
        source.urls.length > 0 &&
        getState().distnet.cache &&
        getState().distnet.cache[task.sourceId] &&
        getState().distnet.cache[task.sourceId].contents
      ) {
        const taskId = labelValueInDescription('id', task.description);

        if (_.isNil(taskId)) {
          alert(
            'Cannot volunteer for a task without an ID.' +
              '  Edit the task and add a unique "id:SOME_VALUE" in the description.'
          );
        } else {
          // sign
          const sign = nodeCrypto.createSign('SHA256');
          const volunteerMessageForSigning: VolunteerMessageForSigning = {
            description: task.description,
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
