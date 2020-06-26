import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import styles from './Counter.css';
import routes from '../../constants/routes.json';
import { dispatchCacheForAll, dispatchSettings } from '../distnet/distnetSlice';
import { dispatchLoadAllTasks } from '../task-lists/taskListsSlice';

export default function Counter() {
  const dispatch = useDispatch();
  const distnet = useSelector((state: RootState) => state.distnet);
  const settingsNum = distnet.settings.sources
    ? distnet.settings.sources.length
    : 0;
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
            dispatch(dispatchSettings());
          }}
          data-tclass="btn"
          type="button"
        >
          reload
        </button>
        <ul>
          {distnet.settings.sources &&
            distnet.settings.sources.map((uriSource) => (
              <li key={uriSource.id}>
                {uriSource.name}
                <ul>
                  <li>
                    {distnet.cache[uriSource.id]
                      ? distnet.cache[uriSource.id].date
                      : '(no local copy yet)'}
                  </li>
                </ul>
              </li>
            ))}
        </ul>

        <button
          className={styles.btn}
          onClick={() => {
            dispatch(dispatchCacheForAll())
              .then(() => dispatch(dispatchLoadAllTasks()))
              .catch((error) => {
                console.log('Failed to load tasks because', error);
              });
          }}
          data-tclass="btn"
          type="button"
        >
          reload source
        </button>
      </div>
    </div>
  );
}
