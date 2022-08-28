import electron from 'electron';
import fs from 'fs';
import React, { useEffect, useState } from 'react';
import ReactHtmlParser from 'react-html-parser';
import { useHistory } from 'react-router-dom';

import getStatic from '../../utils/getStatic';
import styles from './style.css';

const { BrowserWindow } = electron.remote;

// For 'props' type, I tried importing the LocationDescriptor from 'history' but no go.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function HistoryPage(props: Record<string, any>) {
  const win = BrowserWindow.getFocusedWindow();

  const [backgroundColor, setBackgroundColor] = useState<string>()

  useEffect(() => {
    // add listener for search results
    if (win) {
      win.webContents.on('found-in-page', (_event, result) => {
        /**
        result: {
          activeMatchOrdinal: number,
          matches: number,
          requestId: number,
          selectionArea: { height: number, width: number, x: number, y: number }
        }
        * */
        // the word in the input box registers as one match
        if (result.matches <= 1) {
          alert('No matches found.');
        }
      });
    }
  });

  useEffect(() => {
    // Set the bookmarkletFilesLoc because it's different on dev vs prod (and I don't know a better wa to inject it).
    const varScript = document.createElement('script');
    const staticLoc = getStatic('activate-links-bookmarklet');
    // We lose all backslash separators when putting in a string in Windows.
    const staticLocAny = staticLoc.replace(/\\/g, '\\\\'); // replace single backslashes with two
    const varText = `var bookmarkletFilesLoc = "${staticLocAny}";`;
    varScript.appendChild(document.createTextNode(varText));
    document.body.appendChild(varScript);

    const protocolVarScript = document.createElement('script');
    const genealogyPath = '#/genealogy?id=';
    const protocolVarText = `var nonHttpFilePrefix = "${genealogyPath}";`;
    protocolVarScript.appendChild(document.createTextNode(protocolVarText));
    document.body.appendChild(protocolVarScript);

    const windowVarScript = document.createElement('script');
    const windowVarText = `var nonHttpFileSameWindow = true;`;
    windowVarScript.appendChild(document.createTextNode(windowVarText));
    document.body.appendChild(windowVarScript);

    // We're hoping the above finishes and the variables are recognized before the next part runs.

    // Run script to highlight results.
    const script = document.createElement('script');
    // Setting script.src to a relative path points just under the 'app' directory on dev but it's not in packaged apps.
    // script.src = 'features/histories/js/highlight-links.js'; // works on dev
    // script.src = getStatic('/Users/tlarson/dev/home/distrinet/app/features/histories/js/highlight-links.js'); // works on dev
    script.src = getStatic('activate-links-bookmarklet/setup.js');
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
      document.body.removeChild(varScript);
    };
  }, []);

  const switchBackgroundColor = () => {
    let newBackgroundColor = '#ffffff'
    if (backgroundColor === '#ffffff') {
      newBackgroundColor = '#000000'
    }
    setBackgroundColor(newBackgroundColor)

    const embeddedElem = document.getElementById('embeddedContent')

    if (embeddedElem) {
      // try the background for that div
      embeddedElem.style.backgroundColor = newBackgroundColor

      // try the direct child elements inside there
      const children = embeddedElem.children
      for (let i = 0; i < children.length; i++) {
        const htmlChild = children.item(i) as HTMLElement
        if (htmlChild && htmlChild.style) {
          htmlChild.style.backgroundColor = newBackgroundColor
        }
      }

      // try the 'body' elements inside there
      const bodies = embeddedElem.getElementsByTagName('body')
      for (let i = 0; i < bodies.length; i++) {
        bodies[i].style.backgroundColor = newBackgroundColor
      }
    }
  }

  const history = useHistory();
  const { location } = props;
  const params: URLSearchParams = new URLSearchParams(location.search);
  const fullPath = params.get('fullPath');
  const contents = fullPath
    ? fs.readFileSync(fullPath)
    : '(no file name given)';

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
                const target = event.target as HTMLInputElement;
                if (win && target && target.value.length > 0) {
                  win.webContents.findInPage(target.value); // returns result ID
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
      {
        fullPath
        ? (
          <div style={{ textAlign: 'right' }}>
            <button
              type="button"
              onClick={() => switchBackgroundColor()}
            >
              Swap Background Color
            </button>
          </div>
        ) : (
          <div />
        )
      }
      <div id="embeddedContent" style={{ overflow: 'scroll' }}>
        {ReactHtmlParser(contents.toString())}
      </div>
    </div>
  );
}
