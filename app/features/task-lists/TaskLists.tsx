import React from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import styles from './style.css';
import routes from '../../constants/routes.json';
import TaskListsTable from './TaskListsTable';
import { dispatchLoadAllSourcesIntoTasks } from './taskListsSlice';

export default function TaskLists() {
  const dispatch = useDispatch();
  return (
    <div>
      <div className={styles.backButton} data-tid="backButton">
        <Link to={routes.HOME}>
          <i className="fa fa-arrow-left fa-3x" />
        </Link>
      </div>
      <button
        className={styles.btn}
        onClick={() => {
          dispatch(dispatchLoadAllSourcesIntoTasks());
        }}
        data-tclass="btn"
        type="button"
      >
        load tasks
      </button>
      <div>
        <TaskListsTable />
      </div>
    </div>
  );
}
