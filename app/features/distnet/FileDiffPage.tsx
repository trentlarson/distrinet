import fs from 'fs';
import path from 'path';
import * as R from 'ramda';
import React, { useState } from 'react';
import ReactHtmlParser from 'react-html-parser';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import routes from '../../constants/routes.json';
import { RootState } from '../../store';
import styles from './Distnet.css';
import {
  historyDestFullPathFromPaths,
  historyDestFullPathFromUrl,
} from './history';

const diff = require('./diff_match_patch.js');

const fsPromises = fs.promises;

type DiffMergePatch = any;

// from https://github.com/google/diff-match-patch/wiki/Line-or-Word-Diffs
function diffLineMode(dmp: DiffMergePatch, text1: string, text2: string) {
  const a = dmp.diff_linesToChars_(text1, text2); // eslint-disable-line no-underscore-dangle
  const diffs = dmp.diff_main(a.chars1, a.chars2, false);
  dmp.diff_charsToLines_(diffs, a.lineArray); // eslint-disable-line no-underscore-dangle
  return diffs;
}

export default function FileDiffPage(props: Record<string, any>) {
  const distnet = useSelector((state: RootState) => state.distnet);

  const [diffHtml, setDiffHtml] = useState('');
  const [diffError, setDiffError] = useState('');

  const { location } = props;
  if (location && location.search) {
    const params: URLSearchParams = new URLSearchParams(location.search);
    const workUrl = params.get('workUrl');
    const workPath = params.get('workPath');
    const relativePath = params.get('relativePath');

    const source = R.find(
      (s) => s.workUrl === workUrl,
      distnet.settings.sources
    );
    let workConProm: Promise<string | null> | null = null;
    let histPath: string;
    if (workUrl != null && source != null) {
      histPath = historyDestFullPathFromUrl(workUrl);
      workConProm = new Promise((resolve) =>
        resolve(distnet.cache[source.id].contents)
      );
    }
    if (workPath != null && relativePath != null) {
      histPath = historyDestFullPathFromPaths(workPath, relativePath);
      const workFile = path.join(workPath, relativePath);
      workConProm = fsPromises
        .readFile(workFile, { encoding: 'UTF-8' })
        .then((workContentsBuf) => {
          return workContentsBuf.toString();
        })
        .catch((e) => {
          console.log('Got an error reading or diffing the files', e);
          setDiffError('Got an error reading or diffing the files.');
          return null;
        });
    }

    if (workConProm) {
      workConProm
        .then((workContents) => {
          if (workContents == null) {
            setDiffError('There are no file contents to compare.');
            return null;
          }
          return fsPromises
            .readFile(histPath, { encoding: 'UTF-8' })
            .then((histContentsBuf) => {
              const histContents = histContentsBuf.toString();
              const dmp = new diff.diff_match_patch(); // eslint-disable-line new-cap
              // const thisDiff = dmp.diff_main(histContents, workContents); // character-oriented
              const thisDiff = diffLineMode(dmp, histContents, workContents);
              if (thisDiff.length === 1 && thisDiff[0][0] === 0) {
                // there is only one element and it's unchanged (ie. value 0)
                setDiffError(
                  'There are no differences. (Your new copy just has a more recent time on it.)'
                );
              } else {
                setDiffHtml(dmp.diff_prettyHtml(thisDiff));
                if (histContents === '') {
                  setDiffError('The historical version is empty.');
                }
                if (workContents === '') {
                  setDiffError('The current version is empty.');
                }
              }
              return null;
            })
            .catch((err) => {
              if (err.message && err.message.startsWith('ENOENT')) {
                // it doesn't exist
                setDiffError('There is no historical copy of this file.');
              } else {
                console.log('Got an error reading or diffing the files', err);
                setDiffError('Got an error reading or diffing the files.');
              }
            });
        })
        .catch((err) => {
          console.log('Got an error reading the files', err);
          setDiffError('Got an error reading the files.');
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
        <h2>File Changes</h2>
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
