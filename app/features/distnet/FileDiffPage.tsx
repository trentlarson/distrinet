import React from 'react';
import ReactHtmlParser from 'react-html-parser';
import { Link } from 'react-router-dom';
import url from 'url';

import routes from '../../constants/routes.json';
import diff from './diff_match_patch';
import styles from './Distnet.css';
import { historyDestFullPath } from './history';

export default function FileDiffPage(props: Record<string, any>) {
  let workPath, histPath;
  const { location } = props;
  if (location && location.search) {
    const params: URLSearchParams = new URLSearchParams(location.search);
    const workUrl = params.get('workUrl');
    workPath = url.fileURLToPath(workUrl);
    histPath = historyDestFullPath(workUrl);
  }

  const Diff = new diff.diff_match_patch();
  const thisDiff = Diff.diff_main(workPath, histPath);
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
          { ReactHtmlParser(Diff.diff_prettyHtml(thisDiff)) }
        </div>
      </div>
    </div>
  );
}
