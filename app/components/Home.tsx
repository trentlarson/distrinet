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
      <Link to={routes.GENEALOGY}>genealogies</Link>
      <br />
      <Link to={routes.HISTORIES}>histories</Link>
      <br />
      <Link to={routes.TASK_LISTS}>projects</Link>
      <br />
      <br />
      <br />
      <Link to={routes.DISTNET}>settings</Link>
      <br />
      <Link to={routes.HELP}>help</Link>
      {/*
      <br />
      <Link to={routes.COUNTER}>... to Counter</Link>
      */}
    </div>
  );
}
