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
      <h3>Why isn't my data updating?</h3>
      Caching is on by default, so you might see old data. To refresh the cache,
      go to "distrinet settings" and click on "reload source", and if that fails
      then restart this whole app.
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
