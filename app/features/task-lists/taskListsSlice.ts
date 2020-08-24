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
  children: Array<Task>;
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

const parseIssues = (sourceId: string, issueList: any): Task | Array<Task> => {
  if (Array.isArray(issueList)) {
    // I don't expect to see arrays of arrays (outside blockers or subtasks).
    // This helps with typechecks... hope it doesn't do anything unexpected.
    return issueList.map((issue) => parseIssues(sourceId, issue)).flat();
  }
  if (typeof issueList === 'string') {
    return {
      sourceId,
      priority: Number(issueList.toString().substring(0, 2)),
      estimate: Number(issueList.toString().substring(3, 4)),
      description: issueList.toString().substring(5),
      children: [],
    };
  }
  if (typeof issueList === 'object') {
    // expecting a key of the issue with value the children issues
    const key = Object.keys(issueList)[0].toString();
    const subChildren = parseIssues(sourceId, issueList[key]);
    let children = [];
    if (Array.isArray(subChildren)) {
      children = subChildren;
    } else {
      children = [subChildren];
    }
    return {
      sourceId,
      priority: Number(key.substring(0, 2)),
      estimate: Number(key.substring(3, 4)),
      description: key.substring(5),
      children,
    };
  }
  return {
    sourceId,
    priority: null,
    estimate: null,
    description: `Unknown Task Structure: ${typeof issueList} ${
      issueList ? issueList.toString() : ''
    }`,
    children: [],
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
  return dispatch(
    setForecastHtml(`<div><h4>Forecast</h4>${forecastString}</div>`)
  );
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
