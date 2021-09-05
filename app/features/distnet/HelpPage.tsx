import React from 'react';
import process from 'process';
import { Link } from 'react-router-dom';

import routes from '../../constants/routes.json';
import styles from './Distnet.css';

/** ************************************************************

 Add very little functionality here! This page should always work.

 Put functionality inside function calls (eg behind buttons).

************************************************************* */

export default function HelpPage(): JSX.Element {
  /* eslint-disable react/no-unescaped-entities */
  return (
    <>
      <div className={styles.backButton} data-tid="backButton">
        <Link to={routes.HOME}>
          <i className="fa fa-arrow-left fa-3x" />
        </Link>
      </div>
      <br />
      <br />
      <br />
      <br />
      <h2>Help</h2>

      <h3>What sync tools do you recommend?</h3>

      There is a helpful <a onClick={() =>
      require('electron').shell.openExternal('http://familyhistories.info/src-pages-sharing')}>
      decision tree at FamilyHistories.info
      </a>.

      <h3>Why isn't my data updating?</h3>

      Caching is on by default, so you might see old data. To refresh the cache,
      go to "distrinet settings" and click on "reload source", and if that fails
      then restart this whole app.

      <h3>Why do I get the authentication error (especially in genealogies)?</h3>

      Some data sets require authentication, such as FamilySearch. To browse
      FamilySearch, you need to get your Session ID and paste it in on the
      genealogy-specific "Settings". To get your FamilySearch session ID, go to&nbsp;
      <a onClick={() =>
      require('electron').shell.openExternal('https://www.familysearch.org/platform/')}>
      the token page at FamilySearch.org</a>, log in, copy the token, and paste
      it in the <Link to={routes.GENEALOGY_SETTINGS}>"Settings" for the
      genealogy page</Link>.

      <h3>Where do I find this app online?</h3>

      <a onClick={() =>
      require('electron').shell.openExternal('https://github.com/trentlarson/distrinet/')}>
      Source code is here</a> with <a onClick={() =>
      require('electron').shell.openExternal('https://github.com/trentlarson/distrinet/releases')}>
      release builds here</a>.

      <h3>Advanced Help</h3>
      <button
        type="button"
        onClick={() => {
          // eslint-disable-next-line global-require
          require('electron')
            .remote.getCurrentWindow()
            .webContents.toggleDevTools();
        }}
      >
        Toggle Dev Tools
      </button>
      <button
        type="button"
        onClick={() => {
          const appInfo = `
            ${process.env.npm_package_name}
            Version ${process.env.npm_package_version}
          `;
          alert(appInfo);
        }}
      >
        Show App Info
      </button>
      <button
        type="button"
        onClick={() => {
          console.log('process.env', process.env);
        }}
      >
        Log process.env
      </button>
    </>
  );
  /* eslint-enable react/no-unescaped-entities */
}
