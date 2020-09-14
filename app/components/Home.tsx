import React from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import routes from '../constants/routes.json';
import styles from './Home.css';
import { dispatchLoadSettingsFromFileIfEmpty } from '../features/distnet/distnetSlice';

export default function Home(): JSX.Element {
  useDispatch()(dispatchLoadSettingsFromFileIfEmpty());

  return (
    <div className={styles.container} data-tid="container">
      <h2>Home</h2>
      <Link to={routes.DISTNET}>to distrinet settings</Link>
      <br />
      <Link to={routes.GENEALOGY}>to genealogy</Link>
      <br />
      <Link to={routes.HISTORIES}>to histories</Link>
      <br />
      <Link to={routes.TASK_LISTS}>to task lists</Link>
      <br />
      <button
        type="button"
        onClick={() => {
          // eslint-disable-next-line global-require
          require('electron').remote.getCurrentWindow().toggleDevTools();
        }}
      >
        Toggle Dev Tools
      </button>
      <br />
      <Link to={routes.COUNTER}>to Counter</Link>
    </div>
  );
}
