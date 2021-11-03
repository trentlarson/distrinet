import fs from 'fs';
import * as R from 'ramda';
import React, { useState } from 'react';
import ReactHtmlParser from 'react-html-parser';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import url from 'url';

import routes from '../../constants/routes.json';
import diff from './diff_match_patch';
import styles from './Distnet.css';
import { historyDestFullPath } from './history';

const fsPromises = fs.promises;

export default function FileDiffPage(props: Record<string, any>) {
  const distnet = useSelector((state: RootState) => state.distnet);

  const [diffHtml, setDiffHtml] = useState('');

  const { location } = props;
  if (location && location.search) {
    const params: URLSearchParams = new URLSearchParams(location.search);
    const workUrl = params.get('workUrl');
    const workPath = url.fileURLToPath(workUrl);
    const histPath = historyDestFullPath(workUrl);

    const source = R.find(
      (s) => s.workUrl === workUrl,
      distnet.settings.sources
    );
    if (source) {
      const workContents = distnet.cache[source.id].contents;

      fsPromises.readFile(histPath, { encoding: 'UTF-8' })
      .then((histContents) => {
        const Diff = new diff.diff_match_patch();
        const thisDiff = Diff.diff_main(workContents, histContents);
        setDiffHtml(Diff.diff_prettyHtml(thisDiff));
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
        <div style={{ backgroundColor: '#000000' }}>
          <pre>
            { ReactHtmlParser(diffHtml) }
          </pre>
        </div>
      </div>
    </div>
  );
}
