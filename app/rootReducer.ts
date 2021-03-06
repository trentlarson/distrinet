import { combineReducers } from 'redux';
import { connectRouter } from 'connected-react-router';
import { History } from 'history';
// eslint-disable-next-line import/no-cycle
import counterReducer from './features/counter/counterSlice';
// eslint-disable-next-line import/no-cycle
import distnetReducer from './features/distnet/distnetSlice';
// eslint-disable-next-line import/no-cycle
import genealogyReducer from './features/genealogy/genealogySlice';
// eslint-disable-next-line import/no-cycle
import historiesReducer from './features/histories/historiesSlice';
// eslint-disable-next-line import/no-cycle
import taskListsReducer from './features/task-lists/taskListsSlice';

export default function createRootReducer(history: History) {
  return combineReducers({
    router: connectRouter(history),
    counter: counterReducer,
    distnet: distnetReducer,
    genealogy: genealogyReducer,
    histories: historiesReducer,
    taskLists: taskListsReducer,
  });
}
