import _ from 'lodash';
import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import routes from '../constants/routes.json';
import styles from './Home.css';

export default function Home(): JSX.Element {
  const distnet = useSelector((state: RootState) => state.distnet);
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

      <div>
        <ul>
          {distnet.settings.sources &&
            distnet.settings.sources.map((s) => <li key={s.id}>{s.name}</li>)}
        </ul>

        <ul>
          {distnet.cache &&
            _.sum(_.map(distnet.cache, (value) => value.contents.length))}
          &nbsp;characters of cached data
        </ul>
      </div>
    </div>
  );
}
