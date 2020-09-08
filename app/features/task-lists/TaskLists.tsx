import React from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import styles from './style.css';
import routes from '../../constants/routes.json';
import { dispatchLoadAllTaskListsIfEmpty } from './taskListsSlice';
import TaskListsTable from './TaskListsTable';

export default function TaskLists() {
  useDispatch()(dispatchLoadAllTaskListsIfEmpty());

  return (
    <div>
      <div className={styles.backButton} data-tid="backButton">
        <Link to={routes.HOME}>
          <i className="fa fa-arrow-left fa-3x" />
        </Link>
      </div>
      <div>
        <TaskListsTable />
      </div>
    </div>
  );
}
