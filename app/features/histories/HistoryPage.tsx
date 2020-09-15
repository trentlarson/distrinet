import fs from 'fs';
import React from 'react';
import ReactHtmlParser from 'react-html-parser';
import { useHistory } from 'react-router-dom';
import styles from './style.css';

// For 'props' type, I tried importing the LocationDescriptor from 'history' but no go.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function HistoryPage(props: Record<string, any>) {
  const history = useHistory();
  const { location } = props;
  const params: URLSearchParams = new URLSearchParams(location.search);
  const fullPath = params.get('fullPath');
  const contents = fullPath
    ? fs.readFileSync(fullPath)
    : '(no file name given)';
  return (
    <div>
      <div
        className={styles.backButton}
        data-tid="backButton"
        role="button"
        onKeyDown={() => {
          history.goBack();
        }}
        onClick={() => {
          history.goBack();
        }}
        tabIndex={0}
      >
        <i className="fa fa-arrow-left fa-3x" />
      </div>
      <br />
      <br />
      <div>{ReactHtmlParser(contents.toString())}</div>
    </div>
  );
}
