import { createSlice } from '@reduxjs/toolkit';
import fs from 'fs';
import _ from 'lodash';
import yaml from 'js-yaml';
// eslint-disable-next-line import/no-cycle
import { AppThunk } from '../../store';
import { Cache, CacheData, Payload } from '../distnet/distnetClasses';

const fsPromises = fs.promises;

export interface Task {
  sourceId: string;
  priority: number | null;
  estimate: number | null;
  description: string;
  dependents: Array<Task>;
  subtasks: Array<Task>;
}

interface IssueToSchedule {
  key: string;
  summary: string;
  // number of seconds
  issueEstSecondsRaw: number;
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
  if (space1Pos > -1
      || (space1Pos === -1 && remainingText.length > 0)) {
    if (space1Pos === -1) {
      // no spaces at all; still check if it's just a number
      space1Pos = remainingText.length;
    }
    priority = parseFloat(remainingText.substring(0, space1Pos));
    if (!Number.isNaN(priority)) {
      remainingText = remainingText.substring(space1Pos + 1);
      let space2Pos = remainingText.indexOf(' ');
      if (space2Pos > -1
          || (space2Pos === -1 && remainingText.length > 0)) {
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

const parseIssues = (sourceId: string, issueList: any): Task | Array<Task> => {
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

    // The value of the object should always be a list.
    // Each value of the list is either a string (a standalone task)
    // or an object where the key may be:
    // - a word "subtasks", "supertasks", "blocks", or "awaits"
    // - a task descriptions
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
    description: `Unknown Task Structure: ${typeof issueList} ${
      issueList ? issueList.toString() : ''
    }`,
    dependents: [],
    subtasks: [],
  };
};

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
            const issues = parseIssues(entry.sourceId, contentTasks);
            if (Array.isArray(issues)) {
              return issues;
            }
            return [issues];
          })
          .catch((error) => {
            console.error('Failure loading a YAML task list:', error);
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
    issueEstSecondsRaw: t.estimate === null ? 0 : 2 ** t.estimate * 60 * 60,
  }));
  const forecastRequest = {
    issues: forecastTasks,
    createPreferences: { defaultAssigneeHoursPerWeek: hoursPerWeek },
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

export default taskListsSlice.reducer;
