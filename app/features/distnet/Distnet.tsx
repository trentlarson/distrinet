import electron from 'electron';
import _ from 'lodash';
import * as R from 'ramda';
import path from 'path';
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
  addDistrinetTaskSource,
  dispatchCacheForAll,
  dispatchLoadSettingsFromFile,
  dispatchModifySettings,
  dispatchSaveSettingsTextToFile,
  dispatchSetSettingsTextAndYaml,
  generateKeyAndSet,
  testSettingsYaml,
} from './distnetSlice';
import { globalUriScheme, isUriLocalhost } from './uriTools';

/* eslint-disable @typescript-eslint/no-use-before-define */

export default function Distnet() {
  const dispatch = useDispatch();
  const distnet = useSelector((state: RootState) => state.distnet);
  const settingsChangedMessage = distnet.settingsChanged ? (
    <div style={{ color: 'orange' }}>
      Settings have been changed and not yet saved.
    </div>
  ) : (
    <div />
  );

  const settingsFullErrorMessage = distnet.settingsErrorMessage ? (
    <div style={{ color: 'orange' }}>
      There was an error parsing the settings. (Previous settings are still in
      effect.)
      <pre>{distnet.settingsErrorMessage}</pre>
    </div>
  ) : (
    <div />
  );

  const settingsFullSaveErrorMessage = distnet.settingsSaveErrorMessage ? (
    <div style={{ color: 'orange' }}>
      There was an error saving the settings. (Previous settings are still in
      effect.)
      <pre>{distnet.settingsSaveErrorMessage}</pre>
    </div>
  ) : (
    <div />
  );

  const cacheErrorMessage = distnet.cacheErrorMessage ? (
    <div style={{ color: 'orange' }}>
      There was an error loading the cache.
      <pre>{distnet.cacheErrorMessage}</pre>
    </div>
  ) : (
    <div />
  );

  let localStorageLength = 0;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key) {
      localStorageLength += localStorage[key].length;
    }
  }

  return (
    <div>
      <div className={styles.backButton} data-tid="backButton">
        <Link to={routes.HOME}>
          <i className="fa fa-arrow-left fa-3x" />
        </Link>
      </div>

      <div className={styles.content}>
        Config file contents:
        <textarea
          rows={10}
          cols={80}
          value={distnet.settingsText || ''}
          onChange={(event) => {
            dispatch(dispatchSetSettingsTextAndYaml(event.target.value, false));
          }}
        />
        <br />
        Config file is located here:&nbsp;
        <a href={url.pathToFileURL(SETTINGS_FILE).toString()}>
          {SETTINGS_FILE}
        </a>
        <br />
        <div>{settingsChangedMessage}</div>
        <div>{settingsFullErrorMessage}</div>
        <div>{settingsFullSaveErrorMessage}</div>
        <button
          className={styles.btn}
          onClick={() => {
            dispatch(dispatchLoadSettingsFromFile());
          }}
          data-tclass="btn"
          type="button"
        >
          reload config
        </button>
        <button
          className={styles.btn}
          onClick={() => {
            dispatch(dispatchSaveSettingsTextToFile());
          }}
          data-tclass="btn"
          type="button"
        >
          save config
        </button>
        {!distnet.settingsErrorMessage &&
        distnet.settings.sources.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                  Scheme
                </th>
                <th style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                  Name
                </th>
                <th style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                  {/* It's stupid how styles conflict. Try fix this, I dare you. */}
                  {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
                  1<sup>st</sup>
                  URL Remote?
                </th>
                <th style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                  In-Memory Data Date
                </th>
                <th style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {distnet.settings.sources.map((uriSource: Source) => (
                <tr key={uriSource.id}>
                  <td>{uriSource.id ? globalUriScheme(uriSource.id) : '?'}</td>
                  <td>{uriSource.name ? uriSource.name : '(unnamed)'}</td>
                  <td>
                    {uriSource.urls[0] && isUriLocalhost(uriSource.urls[0].url)
                      ? ''
                      : 'Y'}
                  </td>
                  <td>
                    {distnet.cache[uriSource.id]
                      ? distnet.cache[uriSource.id].updatedDate
                      : '(none)'}
                  </td>
                  <td>
                    {uriSource.urls &&
                    Array.isArray(uriSource.urls) && // can fail with malformed settings
                      uriSource.urls.map((inUrl, index) => (
                        <span key={inUrl && inUrl.url}>
                          {/* eslint-disable jsx-a11y/anchor-is-valid,jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
                          {index > 0 ? `, ${index + 1}) ` : ''}
                          <a
                            href="#"
                            key={inUrl && inUrl.url}
                            onClick={(event) => {
                              event.preventDefault();
                              electron.shell.openExternal(inUrl.url);
                            }}
                          >
                            {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
                            Open
                          </a>
                          {inUrl?.url?.startsWith('file:') ? (
                            <span>
                              ,&nbsp;
                              <a href={inUrl.url}>
                                Drag&nbsp;
                                {getExtension(inUrl.url)}
                              </a>
                            </span>
                          ) : (
                            ''
                          )}
                          {/* eslint-enable jsx-a11y/anchor-is-valid,jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
                        </span>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <span />
        )}
        <button
          className={styles.btn}
          onClick={() => dispatch(dispatchCacheForAll())}
          data-tclass="btn"
          type="button"
        >
          reload cache
        </button>
        <div>{cacheErrorMessage}</div>
        <div>
          <ul>
            <li>
              {distnet.cache &&
                _.sum(_.map(distnet.cache, (value) => value.contents.length))}
              &nbsp;characters of cached data
            </li>
            {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
            <li>{localStorageLength} characters of local storage data</li>
          </ul>
        </div>
        <div>
          Advanced&nbsp;
          <button
            type="button"
            onClick={() => {
              let proceed = false;
              if (
                distnet.settings.credentials &&
                R.find(
                  (x) => x.id === 'privateKey',
                  distnet.settings.credentials
                )
              ) {
                // there's already a privateKey credential

                // We need to replace this with dialog.showMessageBox!
                // eslint-disable-next-line no-restricted-globals
                proceed = confirm(
                  'This will overwrite the current private key.  Are you sure you want to proceed?'
                );
              } else {
                proceed = true;
              }
              if (proceed) {
                dispatch(dispatchModifySettings(generateKeyAndSet));
              }
            }}
          >
            Generate Key
          </button>
          <button
            type="button"
            onClick={() => {
              if (distnet.settingsChanged) {
                alert(
                  'You have changes in the current settings, so save or undo those first.'
                );
              } else {
                dispatch(dispatchModifySettings(addDistrinetTaskSource));
              }
            }}
          >
            Add Distrinet Project Source
          </button>
          <button
            type="button"
            onClick={() => {
              if (distnet.settingsChanged) {
                alert(
                  'You have changes in the current settings, so save or undo those first.'
                );
              } else {
                dispatch(
                  dispatchSetSettingsTextAndYaml(testSettingsYaml(), false)
                );
              }
            }}
          >
            Reset to Test Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function getExtension(str: string) {
  const nameStr = str.substring(str.lastIndexOf(path.sep) + 1);
  const dotPos = nameStr.lastIndexOf('.');
  if (dotPos > -1) {
    return nameStr.substring(dotPos + 1);
  }
  return '';
}
