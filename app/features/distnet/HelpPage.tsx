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

      <h3>What am I supposed to do with this?</h3>

      Funny you should ask... there aren't many people who stumble here without some instructions from a friend... but try this test data:
      <ul>
        <li>Go back to the main screen and then to "settings", click "Reset to Test Settings", and then "apply".</li>
        <li>From the main screen, go to "genealogy": click "Change Source" and then enter 'gedcomx:my-local-test:test-sample-norman' and browse around.</li>
        <li>From the main screen, go to "histories": Search for text, or click on the button to expand a directory and click "inspect" and put your mouse over "Jed" and click around.</li>
        <li>From the main screen, go to "projects" and click around.</li>
        <li>Add your own sources and play around.</li>
      </ul>

      <h3>How do I add my sources?</h3>

      Go to your desired app (genealogy, history, or project) and drag the right kind of item onto it (respectively: GedcomX file, directory, or TaskYaml file). Note that you need move to an area where the green "plus" does not show.

      <h3>How do I add semantics to my history files?</h3>

      Here is an example, wrapping "Jed" with the tags that identify him as a Person and give another reference for him:
      <br/>
      <br/>

      { '<span itemscope itemtype="https://schema.org/Person">' }
      <br/>
      &nbsp;&nbsp;&nbsp;&nbsp;{ '<link itemprop="url" href="https://beverlyhillbillies.fandom.com/wiki/Jed_Clampett" />' }
      <br/>
      &nbsp;&nbsp;&nbsp;&nbsp;Jed
      <br/>
      { '</span>' }

      For further reference, see <a onClick={() =>
      require('electron').shell.openExternal('http://familyhistories.info/src-pages-sharing')}>
      the excellent instructions at schema.org
      </a>.

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
            Distrinet Apps
            Version 0.1.17-beta
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
