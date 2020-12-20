import electron from 'electron';
import _ from 'lodash';
import * as R from 'ramda';
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
  dispatchLoadSettingsFromFile,
  dispatchModifySettings,
  dispatchSaveSettingsTextToFile,
  dispatchSetSettingsTextAndYaml,
  generateKeyAndSet,
} from './distnetSlice';
import { globalUriScheme, isUriLocalhost } from './uriTools';

function getExtension(str: string) {
  const dotPos = str.lastIndexOf('.');
  if (dotPos > -1) {
    return str.substring(dotPos + 1);
  }
  return '';
}

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
        <button
          type="button"
          onClick={() => {
            let proceed = false;
            if (
              distnet.settings.credentials &&
              R.find((x) => x.id === 'privateKey', distnet.settings.credentials)
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
                      uriSource.urls.map((inUrl, index) => (
                        <span key={inUrl && inUrl.url}>
                          {index > 0 ? `, ${index + 1}) ` : ''}
                          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
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
                              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                              <a href={inUrl.url}>
                                Drag&nbsp;
                                {getExtension(inUrl.url)}
                              </a>
                            </span>
                          ) : (
                            ''
                          )}
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
            {distnet.cache &&
              _.sum(_.map(distnet.cache, (value) => value.contents.length))}
            &nbsp;characters of cached data
          </ul>
        </div>
      </div>
    </div>
  );
}
