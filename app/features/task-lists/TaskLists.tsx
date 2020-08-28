import React from 'react';
import { Link } from 'react-router-dom';
import styles from './style.css';
import routes from '../../constants/routes.json';
import TaskListsTable from './TaskListsTable';

export default function TaskLists() {
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
