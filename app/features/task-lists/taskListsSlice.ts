import { createSlice } from '@reduxjs/toolkit';
import fs from 'fs';
import _ from 'lodash';
import yaml from 'js-yaml';
// eslint-disable-next-line import/no-cycle
import { AppThunk, RootState } from '../../store';
import { CacheData, Payload, Source } from '../distnet/distnetClasses';

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
    setTaskList: (state: RootState, tasks: Payload<Array<Task>>) => {
      state.bigList = tasks.payload;
    },
    addTaskList: (state: RootState, tasks: Payload<Array<Task>>) => {
      state.bigList = state.bigList.concat(tasks.payload);
    },
  },
});

export const { setTaskList, addTaskList } = taskListsSlice.actions;

function sourceFromId(
  id: string,
  settingsSources: Array<Source>
): Array<Source> {
  return _.find(settingsSources, (source) => source.id === id);
}

/**
 * @return a promise that resolves to Task Promises
 */
async function retrieveAllTasks(
  cacheSources: Array<CacheData>,
  settingsSources: Array<Source>
): Promise<Array<Array<Task>>> {
  let result: Array<Promise<Array<Task>>> = [];
  const cacheValues = _.values(cacheSources);
  if (cacheValues) {
    for (let i = 0; i < cacheValues.length; i += 1) {
      const entry = cacheValues[i];
      if (sourceFromId(entry.sourceId, settingsSources).type === 'taskyaml') {
        const next = fsPromises
          .readFile(entry.localFile)
          .then((resp) => resp.toString())
          .then((contents) => {
            const contentTasks = yaml.safeLoad(contents);
            return contentTasks.map((line: string) => ({
              sourceId: entry.sourceId,
              priority: Number(line.toString().substring(0, 2)),
              estimate: Number(line.toString().substring(3, 4)),
              description: line.toString().substring(5),
            }));
          })
          .catch((error) => {
            console.log('Failure loading a YAML task list:', error);
            return null;
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
    getState().distnet.cache,
    getState().distnet.settings.sources
  );
  return dispatch(setTaskList(_.compact(_.flattenDeep(result))));
};

export default taskListsSlice.reducer;
