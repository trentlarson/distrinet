import _ from 'lodash';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import routes from '../constants/routes.json';
import styles from './Home.css';
import { TaskListTable } from '../features/task-lists/taskLists';
import { dispatchLoadAllSourcesIntoTasks } from '../features/task-lists/taskListsSlice';

export default function Home(): JSX.Element {
  const distnet = useSelector((state: RootState) => state.distnet);

  const dispatch = useDispatch();
  // This loads from all files into a store for TaskListTable
  dispatch(dispatchLoadAllSourcesIntoTasks());

  return (
    <div className={styles.container} data-tid="container">
      <h2>Home</h2>
      <Link to={routes.COUNTER}> -&gt; to Counter</Link>
      <Link to={routes.DISTNET}> -&gt; to distnet settings</Link>

      <div>
        <ul>
          {distnet.settings.sources &&
            distnet.settings.sources.map((s) => <li key={s.id}>{s.name}</li>)}
        </ul>

        <ul>
          {distnet.cache &&
            _.map(distnet.cache, (value) => (
              <li key={value}>{`${value.sourceId} -> ${value.localFile}`}</li>
            ))}
        </ul>

        <ul>
          {distnet.cache &&
            _.sum(_.map(distnet.cache, (value) => value.contents.length))}
          &nbsp;characters of data
        </ul>

        <TaskListTable />
      </div>
    </div>
  );
}
