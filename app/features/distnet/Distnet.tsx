import _ from 'lodash';
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import url from 'url';

import routes from '../../constants/routes.json';
import { RootState } from '../../store';

import { Source } from './distnetClasses';
import styles from './Distnet.css';
import { SETTINGS_FILE } from './settings';
import {
  dispatchCacheForAll,
  dispatchLoadSettings,
  dispatchSaveSettings,
  textIntoState,
} from './distnetSlice';

export default function Distnet() {
  const dispatch = useDispatch();
  const distnet = useSelector((state: RootState) => state.distnet);
  const settingsNum = distnet.settings.sources
    ? distnet.settings.sources.length
    : 0;
  const settingsCountText = `${settingsNum} source${
    settingsNum === 1 ? '' : 's'
  }`;

  const settingsFullErrorMessage = distnet.settingsErrorMessage ? (
    <div>
      There was an error parsing the settings. (Previous settings are still in
      effect.)
      <pre>{distnet.settingsErrorMessage}</pre>
    </div>
  ) : (
    <div />
  );

  const settingsFullSaveErrorMessage = distnet.settingsSaveErrorMessage ? (
    <div>
      There was an error saving the settings. (Previous settings are still in
      effect.)
      <pre>{distnet.settingsSaveErrorMessage}</pre>
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
        Config file is located here:
        <a href={url.pathToFileURL(SETTINGS_FILE).toString()}>
          {SETTINGS_FILE}
        </a>
        <br />
        Config contents:
        <textarea
          rows={10}
          cols={80}
          value={distnet.settingsText || ''}
          onChange={(event) => {
            dispatch(textIntoState(event.target.value));
          }}
        />
        <div>{settingsFullErrorMessage}</div>
        <div>{settingsFullSaveErrorMessage}</div>
        <button
          className={styles.btn}
          onClick={() => {
            dispatch(dispatchLoadSettings());
          }}
          data-tclass="btn"
          type="button"
        >
          load config
        </button>
        <button
          className={styles.btn}
          onClick={() => {
            dispatch(dispatchSaveSettings());
          }}
          data-tclass="btn"
          type="button"
        >
          save config
        </button>
        <ul>
          {distnet.settings.sources &&
            distnet.settings.sources.map((uriSource: Source) => (
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
          load source
        </button>
        <ul>
          {distnet.cache &&
            _.sum(_.map(distnet.cache, (value) => value.contents.length))}
          &nbsp;characters of cached data
        </ul>
      </div>
    </div>
  );
}
