import React from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import routes from '../constants/routes.json';
import styles from './Home.css';
import { dispatchLoadSettingsAndCacheIfEmpty } from '../features/distnet/distnetSlice';
import { resetState as historiesResetState } from '../features/histories/historiesSlice';

export default function Home(): JSX.Element {
  useDispatch()(dispatchLoadSettingsAndCacheIfEmpty([historiesResetState]));

  return (
    <div className={styles.container} data-tid="container">
      <h2>Go</h2>
      <Link to={routes.DISTNET}>to distrinet settings</Link>
      <br />
      <Link to={routes.GENEALOGY}>to genealogy</Link>
      <br />
      <Link to={routes.HISTORIES}>to histories</Link>
      <br />
      <Link to={routes.TASK_LISTS}>to projects</Link>
      <br />
      <Link to={routes.HELP}>help</Link>
      {/*
      <br />
      <Link to={routes.COUNTER}>to Counter</Link>
      */}
    </div>
  );
}
