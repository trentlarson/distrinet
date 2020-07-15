import React from 'react';
import { Link } from 'react-router-dom';
import routes from '../constants/routes.json';
import styles from './Home.css';

export default function Home(): JSX.Element {
  return (
    <div className={styles.container} data-tid="container">
      <h2>Home</h2>
      <Link to={routes.COUNTER}> -&gt; Counter</Link>
      <br />
      <Link to={routes.DISTNET}> -&gt; distnet settings</Link>
      <br />
      <Link to={routes.GENEALOGY}> -&gt; genealogy</Link>
      <br />
      <Link to={routes.HISTORIES}> -&gt; histories</Link>
      <br />
      <Link to={routes.TASK_LISTS}> -&gt; task lists</Link>
    </div>
  );
}
