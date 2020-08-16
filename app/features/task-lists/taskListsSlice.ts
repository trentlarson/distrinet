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
            if (Array.isArray(contentTasks)) {
              return contentTasks.map((line: string) => ({
                sourceId: entry.sourceId,
                priority: Number(line.toString().substring(0, 2)),
                estimate: Number(line.toString().substring(3, 4)),
                description: line.toString().substring(5),
              }));
            }
            console.error(
              'Loaded tasks YAML but got non-array result:\n',
              contentTasks
            );
            return [];
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
