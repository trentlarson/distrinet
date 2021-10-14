import electron from 'electron';
import _ from 'lodash';
import { DateTime } from 'luxon';
import * as R from 'ramda';
import path from 'path';
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import url from 'url';

import routes from '../../constants/routes.json';
import { RootState } from '../../store';

import { SourceInternal } from './distnetClasses';
import styles from './Distnet.css';
import { SETTINGS_FILE } from './settings';
import {
  addDistrinetTaskSource,
  dispatchAddReviewedDateToSettings,
  dispatchCacheForAll,
  dispatchLoadSettingsFromFile,
  dispatchModifySettings,
  dispatchSaveSettingsTextToFileAndResetObject,
  dispatchSetSettingsTextAndYaml,
  generateKeyAndSet,
  dispatchSetSettingsText,
  testSettingsYamlText,
} from './distnetSlice';
import uriTools from './uriTools';

/* eslint-disable @typescript-eslint/no-use-before-define */

interface AppInfo {
  appPath: string;
}

export default function Distnet(options: AppInfo) {
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
        <h2>Settings</h2>
      </div>

      <div className={styles.content}>
        <br />
        <br />
        {!distnet.settingsErrorMessage &&
        distnet.settings.sources.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                  IRI
                </th>
                <th style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                  Name
                </th>
                <th style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                  {/* It's stupid how styles conflict. Try fix this, I dare you. */}
                  {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
                  Remote
                </th>
                <th style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                  Needs
                  <br />
                  Review
                </th>
                <th style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                  In-Memory
                  <br />
                  Data Date
                </th>
                <th style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {distnet.settings.sources.map((uriSource: SourceInternal) => {
                let needsReview = R.isNil(uriSource.dateReviewed);
                if (uriSource.dateReviewed && distnet.cache[uriSource.id]) {
                  const diskDate = distnet.cache[uriSource.id].updatedDate;
                  if (
                    DateTime.fromISO(diskDate) >
                    DateTime.fromISO(uriSource.dateReviewed)
                  ) {
                    needsReview = true;
                  }
                }
                const needsReviewStr = needsReview ? 'Y' : '';
                return (
                  <tr key={uriSource.workUrl}>
                    <td>
                      {uriTools.globalUriScheme(uriSource.id)}
                      &nbsp;
                      {/* eslint-disable no-new */}
                      {/* eslint-disable-next-line jsx-a11y/anchor-has-content,jsx-a11y/anchor-is-valid,jsx-a11y/click-events-have-key-events,jsx-a11y/control-has-associated-label,jsx-a11y/interactive-supports-focus,no-new */}
                      <a
                        className="fa fa-copy"
                        role="button"
                        title={`Copy IRI ${uriSource.id}`}
                        onClick={() => {
                          electron.clipboard.writeText(uriSource.id);
                          new Notification('Copied', {
                            body: `Added this to your clipboard: ${uriSource.id}`,
                            silent: true,
                          });
                        }}
                      />
                      {/* eslint-enable no-new */}
                      &nbsp;
                      <a
                        href={uriSource.idFile}
                        onClick={() => {
                          alert(
                            'This IRI file is meant to be dragged into a text editor. Restart the app if that is not what you wanted.' // eslint-disable-line max-len
                          );
                        }}
                      >
                        <i title="Drag IRI File" className="fa fa-hand-rock" />
                      </a>
                    </td>
                    <td>{uriSource.name ? uriSource.name : '(unnamed)'}</td>
                    <td>
                      {uriTools.isUriLocalhost(uriSource.workUrl) ? '' : 'Y'}
                    </td>
                    <td>
                      {needsReviewStr}
                      &nbsp;
                      {!needsReview ? (
                        ''
                      ) : (
                        /* eslint-disable jsx-a11y/anchor-is-valid,jsx-a11y/control-has-associated-label,jsx-a11y/anchor-has-content */
                        <a
                          className="fas fa-check-circle"
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            dispatch(
                              dispatchAddReviewedDateToSettings(uriSource.id)
                            );
                          }}
                        />
                        /* eslint-enable jsx-a11y/anchor-is-valid,jsx-a11y/control-has-associated-label,jsx-a11y/anchor-has-content */
                      )}
                    </td>
                    <td>
                      {distnet.cache[uriSource.id]
                        ? distnet.cache[uriSource.id].updatedDate.replace(
                            'T',
                            ' '
                          )
                        : '(none)'}
                    </td>
                    <td>
                      {R.prepend(
                        { url: uriSource.workUrl },
                        uriSource.urls || []
                      ).map((inUrl, index) => (
                        <span key={inUrl && inUrl.url}>
                          {/* eslint-disable jsx-a11y/anchor-is-valid,jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
                          &nbsp;
                          <a
                            href="#"
                            key={inUrl && inUrl.url}
                            onClick={(event) => {
                              event.preventDefault();
                              electron.shell.openExternal(inUrl.url);
                            }}
                          >
                            {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
                            <i title={`Open ${inUrl.url}`} className="fas fa-external-link-alt" />
                          </a>
                          {inUrl?.url?.startsWith('file:') ? (
                            <span>
                              &nbsp;
                              <a href={inUrl.url}>
                                <i
                                  title={`Drag ${inUrl.url}`}
                                  className="fa fa-hand-rock"
                                />
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
                );
              })}
            </tbody>
          </table>
        ) : (
          <span />
        )}
        <div>{cacheErrorMessage}</div>
        <div>
          <br />
          <br />
          <hr />
          <h2>Advanced</h2>
          <br />
          <br />
          <br />
          Config file contents:
          <textarea
            rows={10}
            cols={80}
            value={distnet.settingsText || ''}
            onChange={(event) => {
              dispatch(dispatchSetSettingsText(event.target.value, true));
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
            load from file
          </button>
          <button
            className={styles.btn}
            onClick={() => {
              dispatch(
                dispatchSetSettingsTextAndYaml(distnet.settingsText || '', true)
              );
            }}
            data-tclass="btn"
            type="button"
          >
            &nbsp;
            <br />
            apply
            <br />
            &nbsp;
          </button>
          <button
            className={styles.btn}
            onClick={() => {
              dispatch(dispatchSaveSettingsTextToFileAndResetObject());
            }}
            data-tclass="btn"
            type="button"
          >
            apply
            <br />
            &
            <br />
            save
          </button>
        </div>
        <div>
          <button
            className="generateKeyButton"
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
                  dispatchSetSettingsText(
                    testSettingsYamlText(options.appPath),
                    true
                  )
                );
              }
            }}
          >
            Reset to Test Settings
          </button>
        </div>
        <div>
          <ul>
            <li>
              {distnet.cache &&
                _.sum(_.map(distnet.cache, (value) => value.contents.length))}
              &nbsp;characters in memory
            </li>
            {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
            <li>{localStorageLength} characters of local storage data</li>
          </ul>
          <button
            className={styles.btn}
            onClick={() => dispatch(dispatchCacheForAll())}
            data-tclass="btn"
            type="button"
          >
            reload mem
          </button>
        </div>
      </div>
    </div>
  );
}
