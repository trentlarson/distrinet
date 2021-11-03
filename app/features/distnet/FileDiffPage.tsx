import fs from 'fs';
import * as R from 'ramda';
import React, { useState } from 'react';
import ReactHtmlParser from 'react-html-parser';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import routes from '../../constants/routes.json';
import { RootState } from '../../store';
import styles from './Distnet.css';
import { historyDestFullPath } from './history';

const diff = require('./diff_match_patch.js');

const fsPromises = fs.promises;

export default function FileDiffPage(props: Record<string, any>) {
  const distnet = useSelector((state: RootState) => state.distnet);

  const [diffHtml, setDiffHtml] = useState('');
  const [diffError, setDiffError] = useState('');

  const { location } = props;
  if (location && location.search) {
    const params: URLSearchParams = new URLSearchParams(location.search);
    const workUrl = params.get('workUrl');

    const source = R.find(
      (s) => s.workUrl === workUrl,
      distnet.settings.sources
    );
    if (workUrl && source) {
      const histPath = historyDestFullPath(workUrl);
      const workContents = distnet.cache[source.id].contents;

      fsPromises
        .readFile(histPath, { encoding: 'UTF-8' })
        .then((histContents) => {
          const dmp = new diff.diff_match_patch(); // eslint-disable-line new-cap
          const thisDiff = dmp.diff_main(histContents, workContents);
          return setDiffHtml(dmp.diff_prettyHtml(thisDiff));
        })
        .catch((e) => {
          console.log('Got an error reading or diffing the files', e);
          setDiffError('Got an error reading or diffing the files.');
        });
    }
  }

  return (
    <div>
      <div className={styles.backButton} data-tid="backButton">
        <Link to={routes.DISTNET}>
          <i className="fa fa-arrow-left fa-3x" />
        </Link>
      </div>
      <div>
        <br />
        <br />
        <br />
        <h2>Changes</h2>
        <br />
        {diffError}
        <br />
        <div style={{ backgroundColor: '#000000' }}>
          <pre>{ReactHtmlParser(diffHtml)}</pre>
        </div>
      </div>
    </div>
  );
}
