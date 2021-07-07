import electron from 'electron'
import fs from 'fs';
import React, { useEffect } from 'react';
import ReactHtmlParser from 'react-html-parser';
import { useHistory } from 'react-router-dom';
import styles from './style.css';

const BrowserWindow = electron.remote.BrowserWindow;

// For 'props' type, I tried importing the LocationDescriptor from 'history' but no go.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function HistoryPage(props: Record<string, any>) {

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'features/histories/js/highlight-links.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const history = useHistory();
  const { location } = props;
  const params: URLSearchParams = new URLSearchParams(location.search);
  const fullPath = params.get('fullPath');
  const contents = fullPath
    ? fs.readFileSync(fullPath)
    : '(no file name given)';

  let win = BrowserWindow.getFocusedWindow();
  win.webContents.on('found-in-page', (event, result) => {
    // result: { requestId: number, activeMatchOrdinal: number, matches: number, selectionArea: { height: number, width: number, x: number, y: number }}
    if (result.matches <= 1) { // because the word they typed registers as a match
      alert('No matches found.')
    }
  });

  return (
    <div>
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
        <div style={{ padding: 20, marginLeft: 100 }}>
          Search:
          <input
            type="text"
            size={20}
            onKeyUp={(event) => {
              if (event.keyCode === 13) {
                // 13 = enter key
                if (event.target.value.length > 0) {
                  win.webContents.findInPage(event.target.value); // returns ID
                }
              }
            }}
          />
          <br />
          (Hit Enter, then scroll to see matches)
        </div>
      </div>
      <br />
      <br />
      {ReactHtmlParser(contents.toString())}
    </div>
  );
}
