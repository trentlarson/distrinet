import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import styles from './Counter.css';
import routes from '../../constants/routes.json';
import { reloadSettings, selectSettings } from '../settings/settingsSlice';

export default function Counter() {
  const dispatch = useDispatch();
  const settings = useSelector(selectSettings);
  const settingsNum = settings.sources ? settings.sources.length : 0;
  const settingsText = `${settingsNum} URI${settingsNum === 1 ? '' : 's'}`;
  return (
    <div>
      <div className={styles.backButton} data-tid="backButton">
        <Link to={routes.HOME}>
          <i className="fa fa-arrow-left fa-3x" />
        </Link>
      </div>
      <div className={`counter ${styles.counter}`} data-tid="counter">
        {settingsText}
      </div>
      <div className={styles.btnGroup}>
        <button
          className={styles.btn}
          onClick={() => {
            dispatch(reloadSettings());
          }}
          data-tclass="btn"
          type="button"
        >
          reload
        </button>
      </div>
    </div>
  );
}
