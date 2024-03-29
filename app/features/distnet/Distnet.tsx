import electron from 'electron';
import _ from 'lodash';
import { DateTime } from 'luxon';
import * as R from 'ramda';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import url from 'url';

import routes from '../../constants/routes.json';
import { RootState } from '../../store';

import { FILE_EXTENSIONS_FOR_HISTORY, SourceInternal } from './distnetClasses';
import styles from './Distnet.css';
import { SETTINGS_FILE } from './settings';
import {
  addDistrinetTaskSource,
  dispatchAddReviewedDateToSettings,
  dispatchLoadSettingsFromFile,
  dispatchModifySettings,
  dispatchReloadCacheForAll,
  dispatchSaveSettingsTextToFileAndResetObject,
  dispatchSetChangesAckedAndSave,
  dispatchSetSettingsTextAndYaml,
  dispatchSetSettingsText,
  generateKeyAndSet,
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
  const [keyPassword, setKeyPassword] = useState('');

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
        <h2>Settings</h2>

        <div>
          {R.filter(
            (source) => source.notifyChanged,
            distnet.settings.sources
          ).map((source: SourceInternal) => (
            <span key={source.id}>
              <button
                type="button"
                style={{ borderRadius: '8px' }}
                onClick={() => {
                  dispatch(dispatchSetChangesAckedAndSave(source.id));
                }}
              >
                There are changes for your review in&nbsp;
                {source.name}
                &nbsp;
                <span className="fas fa-thumbs-up" />
              </button>
              <br />
            </span>
          ))}
        </div>

        {!distnet.settingsErrorMessage &&
        distnet.settings.sources.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                  IRI
                </th>
                <th style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                  Actions
                </th>
                <th style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                  Name
                </th>
                <th style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                  In-Memory
                  <br />
                  Data Date
                </th>
                <th style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                  Needs
                  <br />
                  Review?
                </th>
              </tr>
            </thead>
            <tbody>
              {distnet.settings.sources.map((uriSource: SourceInternal) => {
                let needsReview;
                if (R.isNil(distnet.cache[uriSource.id])) {
                  needsReview = null;
                } else if (R.isNil(uriSource.dateReviewed)) {
                  needsReview = true;
                } else {
                  const cache = distnet.cache[uriSource.id];
                  if (
                    DateTime.fromISO(cache.updatedDate) >
                    DateTime.fromISO(uriSource.dateReviewed)
                  ) {
                    needsReview = true;
                  } else if (cache.fileCache.length > 0) {
                    needsReview = true;
                  } // that covers file & dir cases
                }

                /* eslint-disable no-nested-ternary,prettier/prettier */
                const needsReviewStr = R.isNil(distnet.cache[uriSource.id])
                  ? '?'
                  : needsReview
                    ? 'Y'
                    : '';
                const needsReviewTitle = R.isNil(distnet.cache[uriSource.id])
                  ? 'Current Date for Source is Unknown'
                  : R.isNil(uriSource.dateReviewed)
                    ? 'Never Reviewed'
                    : `Updated ${distnet.cache[uriSource.id].updatedDate.replace('T', ' ').replace('Z', ' UTC')},` +
                      ` Reviewed ${uriSource.dateReviewed.replace('T', ' ').replace('Z', ' UTC')}`;
                /* eslint-enable no-nested-ternary,prettier/prettier */

                return (
                  <tr key={uriSource.workUrl}>
                    <td>
                      {/* eslint-disable no-new */}
                      {/* eslint-disable-next-line jsx-a11y/anchor-has-content,jsx-a11y/anchor-is-valid,jsx-a11y/click-events-have-key-events,jsx-a11y/control-has-associated-label,jsx-a11y/interactive-supports-focus,no-new */}
                      <a
                        className="fa fa-copy"
                        role="button"
                        title={`Copy to Clipboard: ${uriSource.id}`}
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
                        <i
                          title={`Drag IRI File ${uriSource.idFile}`}
                          className="fa fa-hand-rock"
                        />
                      </a>
                      &nbsp;
                      {uriTools.globalUriScheme(uriSource.id)}
                    </td>
                    <td>
                      {R.prepend(
                        { url: uriSource.workUrl },
                        uriSource.urls || []
                      ).map((inUrl) => (
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
                            <i
                              title={`Open ${inUrl.url}`}
                              className="fas fa-external-link-alt"
                            />
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
                    <td>{uriSource.name ? uriSource.name : '(unnamed)'}</td>
                    <td>
                      {distnet.cache[uriSource.id]
                        ? `${distnet.cache[uriSource.id].updatedDate
                            .replace('T', ' ')
                            .replace('Z', ' UTC')}`
                        : '(none)'}
                    </td>
                    <td>
                      <span title={needsReviewTitle}>{needsReviewStr}</span>
                      &nbsp;
                      {/* eslint-disable jsx-a11y/anchor-is-valid,jsx-a11y/control-has-associated-label,jsx-a11y/anchor-has-content */}
                      {!needsReview ? (
                        ''
                      ) : (
                        <a
                          title="Mark as Reviewed"
                          className="fas fa-check-circle"
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            // We need to replace this with dialog.showMessageBox!
                            // eslint-disable-next-line no-restricted-globals
                            const proceed = confirm(
                              'You may not be able to review differences after this. Please confirm.'
                            );
                            if (proceed) {
                              dispatch(
                                dispatchAddReviewedDateToSettings(uriSource.id)
                              );
                            }
                          }}
                        />
                      )}
                      {/* eslint-enable jsx-a11y/anchor-is-valid,jsx-a11y/control-has-associated-label,jsx-a11y/anchor-has-content */}
                      &nbsp;
                      {/* eslint-disable no-nested-ternary,prettier/prettier */}
                      {!needsReview ? (
                        ''
                      ) : (
                        R.isNil(uriSource.dateReviewed) ? (
                          <i
                            title="There are differences but there is no history for comparison."
                            className="fa fa-minus"
                          />
                        ) : (
                          distnet.cache[uriSource.id].contents == null ? (
                            // must be a directory
                            <Link
                              to={{
                                pathname: routes.DIRECTORY_DIFF,
                                search: new URLSearchParams({
                                  sourceId: uriSource.id,
                                }).toString(),
                              }}
                            >
                              <i
                                title="There are nested files with differences."
                                className="fa fa-folder-open"
                              />
                            </Link>
                          ) : (
                            <Link
                              to={{
                                pathname: routes.FILE_DIFF,
                                search: new URLSearchParams({
                                  workPath: url.fileURLToPath(uriSource.workUrl),
                                }).toString(),
                              }}
                            >
                              <i title="See Diffs" className="fa fa-align-left" />
                            </Link>
                          )
                        )
                      )}
                      {/* eslint-disable no-nested-ternary */}
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
          Note that this only tracks changes to files with these
          extensions:&nbsp;
          {FILE_EXTENSIONS_FOR_HISTORY.join(' ')}
        </div>
        <div>
          <br />
          <button
            style={{ borderRadius: '8px' }}
            onClick={() => dispatch(dispatchReloadCacheForAll())}
            data-tclass="btn"
            type="button"
          >
            Reload From Disk
          </button>
        </div>
      </div>
      <div className={styles.subsection}>
        <div>
          <hr />
          <h2>Advanced</h2>
        </div>
        <div className={styles.subsection}>
          Security
          <div className={styles.subsection}>
            <button
              className="generateKeyButton"
              type="button"
              onClick={async () => {
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
                  await dispatch(
                    dispatchModifySettings(generateKeyAndSet(keyPassword))
                  );
                  if (keyPassword) {
                    // eslint-disable-next-line no-new
                    new Notification('Generated', {
                      body: `Be sure to save your password so that you will never lose access to this key.`,
                      silent: true,
                    });
                  } else {
                    alert(
                      'The private key has been generated. Note that it is encrypted with a blank password. It is better to create a different one that is protected by a password.' // eslint-disable-line max-len
                    );
                  }
                }
              }}
            >
              Generate Key, encrypted with password:
            </button>
            &nbsp;
            <input
              size={17}
              type="text"
              value={keyPassword}
              onChange={(e) => setKeyPassword(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.subsection}>
          Configuration
          <div className={styles.subsection}>
            Config file contents:
            <br />
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
            &nbsp;&nbsp;&nbsp;
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
            &nbsp;&nbsp;&nbsp;
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
            <br />
            <br />
            <button
              type="button"
              style={{ borderRadius: '8px' }}
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
              Add Distrinet Project Sources
            </button>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            <button
              type="button"
              style={{ borderRadius: '8px' }}
              onClick={() => {
                if (distnet.settingsChanged) {
                  alert(
                    'You have changes in the current settings, so save or undo those first.'
                  );
                } else {
                  dispatch(
                    dispatchSetSettingsTextAndYaml(
                      testSettingsYamlText(options.appPath),
                      true
                    )
                  );
                }
              }}
            >
              Replace with Test Settings
            </button>
          </div>
        </div>
        <div className={styles.subsection}>
          Memory Cache
          <div className={styles.subsection}>
            <ul>
              <li>
                {distnet.cache &&
                  _.sum(_.map(distnet.cache, (value) => value.contents?.length))}
                &nbsp;characters in memory
              </li>
              {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
              <li>{localStorageLength} characters of local storage data</li>
            </ul>
            <button
              style={{ borderRadius: '8px' }}
              onClick={() => dispatch(dispatchReloadCacheForAll())}
              data-tclass="btn"
              type="button"
            >
              Reload From Disk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
