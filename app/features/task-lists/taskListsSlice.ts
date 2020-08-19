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
  priority: number;
  estimate: number;
  description: string;
}

const taskListsSlice = createSlice({
  name: 'taskLists',
  initialState: { bigList: [] as Array<Task> },
  reducers: {
    setTaskList: (state, tasks: Payload<Array<Task>>) => {
      state.bigList = tasks.payload;
    },
    addTaskList: (state, tasks: Payload<Array<Task>>) => {
      state.bigList = state.bigList.concat(tasks.payload);
    },
  },
});

export const { setTaskList, addTaskList } = taskListsSlice.actions;

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

const parseIssues = (sourceId, issueList) => {
  if (Array.isArray(issueList)) {
    return issueList.map((issue) => parseIssues(sourceId, issue));
  }
  if (typeof issueList === 'string') {
    return {
      sourceId,
      priority: Number(issueList.toString().substring(0, 2)),
      estimate: Number(issueList.toString().substring(3, 4)),
      description: issueList.toString().substring(5),
    };
  }
  if (typeof issueList === 'object') {
    // expecting a key of the issue with value the children issues
    const key = Object.keys(issueList)[0].toString();
    return {
      sourceId,
      priority: Number(key.substring(0, 2)),
      estimate: Number(key.substring(3, 4)),
      description: key.substring(5),
      children: parseIssues(sourceId, issueList[key]),
    };
  }
  return `Unknown Task Structure: ${typeof issueList} ${
    issueList ? issueList.toString() : ''
  }`;
};

/**
 * @return a promise that resolves to Task Promises
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
            return parseIssues(entry.sourceId, contentTasks);
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
