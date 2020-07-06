import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import styles from './Distnet.css';
import routes from '../../constants/routes.json';
import { dispatchCacheForAll, dispatchSettings } from './distnetSlice';

export default function Distnet() {
  const dispatch = useDispatch();
  const distnet = useSelector((state: RootState) => state.distnet);
  const settingsNum = distnet.settings.sources
    ? distnet.settings.sources.length
    : 0;
  const settingsCountText = `${settingsNum} URI${settingsNum === 1 ? '' : 's'}`;

  const settingsFullErrorMessage = distnet.settingsErrorMessage ? (
    <div>
      There was an error parsing the settings. (Previous settings are still in
      effect.)
      <pre>{distnet.settingsErrorMessage}</pre>
    </div>
  ) : (
    <div />
  );

  return (
    <div>
      <div className={styles.backButton} data-tid="backButton">
        <Link to={routes.HOME}>
          <i className="fa fa-arrow-left fa-3x" />
        </Link>
      </div>
      <div className={`distnet ${styles.distnet}`} data-tid="distnet">
        {settingsCountText}
      </div>
      <div className={styles.btnGroup}>
        <textarea rows="10" cols="80" defaultValue={distnet.settingsText} />
        <div>{settingsFullErrorMessage}</div>
        <button
          className={styles.btn}
          onClick={() => {
            dispatch(dispatchSettings());
          }}
          data-tclass="btn"
          type="button"
        >
          reload config
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
          onClick={() => dispatch(dispatchCacheForAll())}
          data-tclass="btn"
          type="button"
        >
          reload source
        </button>
      </div>
    </div>
  );
}
