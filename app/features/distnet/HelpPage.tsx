import React from 'react';
import { Link } from 'react-router-dom';

import routes from '../../constants/routes.json';
import styles from './Distnet.css';

/** ************************************************************

 Add very little functionality here! This page should always work.

 Even "process" references have caused problems.  Ug.

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
      Caching is on by default. To refresh the cache, go to "distrinet settings"
      and click on "reload source".
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
    </>
  );
  /* eslint-enable react/no-unescaped-entities */
}
