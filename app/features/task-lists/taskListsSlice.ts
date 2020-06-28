import { createSlice } from '@reduxjs/toolkit';
import fs from 'fs';
import _ from 'lodash';
import yaml from 'js-yaml';

const fsPromises = fs.promises;

interface Task {
  sourceId: string;
  priority: number;
  estimate: number;
  description: string;
}
interface TaskPayload {
  type: string;
  payload: Array<Task>;
}

const taskListsSlice = createSlice({
  name: 'taskLists',
  initialState: { bigList: [] } as Array<Task>,
  reducers: {
    setTaskList: (state: RootState, tasks: TaskPayload) => {
      state.bigList = tasks.payload;
    },
    addTaskList: (state: RootState, tasks: TaskPayload) => {
      state.bigList = state.bigList.concat(tasks.payload);
    },
  },
});

export const { setTaskList, addTaskList } = taskListsSlice.actions;

async function retrieveAllTasks(
  cacheSources: Array<CacheData>
): Array<Promise<Task>> {
  let result: Array<Promise<Task>> = [];
  const cacheValues = _.values(cacheSources);
  if (cacheValues) {
    for (let i = 0; i < cacheValues.length; i += 1) {
      const entry = cacheValues[i];
      const next = fsPromises
        .readFile(entry.localFile)
        .then((resp) => resp.toString())
        .then((contents) => {
          const contentTasks = yaml.safeLoad(contents);
          return contentTasks.map((line) => ({
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
  return Promise.all(result);
}

export const dispatchLoadAllSourcesIntoTasks = (): AppThunk => async (
  dispatch,
  getState
) => {
  const result: Array<Array<CacheData>> = await retrieveAllTasks(
    getState().distnet.cache
  );
  return dispatch(setTaskList(_.flattenDeep(result)));
};

export default taskListsSlice.reducer;
