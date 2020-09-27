import electron from 'electron';
import path from 'path';
import * as R from 'ramda';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import GridLoader from 'react-spinners/GridLoader';
import url, { URLSearchParams, fileURLToPath } from 'url';

import routes from '../../constants/routes.json';
import { RootState } from '../../store';
import {
  dispatchEraseSearchResults,
  dispatchLoadHistoryDirsIfEmpty,
  dispatchToggleShowDir,
  dispatchTextSearch,
  FileTree,
  SearchProgress,
} from './historiesSlice';
import styles from './style.css';

enum Visibility {
  visible = 'visible',
  hidden = 'hidden',
}

function isSearchingVisible(historiesIsSearching: SearchProgress) {
  return historiesIsSearching.done < historiesIsSearching.total
    ? Visibility.visible
    : Visibility.hidden;
}

export default function Histories() {
  const distnet = useSelector((state: RootState) => state.distnet);
  const dispatch = useDispatch();

  dispatch(dispatchLoadHistoryDirsIfEmpty());

  const historySources = R.filter(
    (s) => s.id.startsWith('histories:'),
    distnet.settings.sources
  );

  const [idInputExpanded, setIdInputExpanded] = useState(Visibility.hidden);
  const [idSearchTerm, setIdSearchTerm] = useState('');

  const histories = useSelector((state: RootState) => state.histories);

  return (
    <div>
      <div className={styles.backButton} data-tid="backButton">
        <Link to={routes.HOME}>
          <i className="fa fa-arrow-left fa-3x" />
        </Link>
      </div>
      <div className={styles.sign} data-tid="sign">
        Histories
      </div>
      <div className={styles.histories}>
        <div>
          <button
            type="button"
            onClick={() => {
              setIdSearchTerm('');
              setIdInputExpanded(Visibility.visible);
            }}
          >
            Search
          </button>
          <input
            type="text"
            size={32}
            style={{ visibility: idInputExpanded }}
            onChange={(event) => {
              setIdSearchTerm(event.target.value);
            }}
            onKeyUp={(event) => {
              if (event.keyCode === 13) {
                // 13 = enter key
                setIdInputExpanded(Visibility.hidden);
                if (idSearchTerm.length > 0) {
                  dispatch(dispatchTextSearch(idSearchTerm));
                } else {
                  dispatch(dispatchEraseSearchResults());
                }
              }
            }}
          />
        </div>
        <div>{idSearchTerm}</div>
        <div style={{ visibility: isSearchingVisible(histories.isSearching) }}>
          <GridLoader color="silver" />
          {`${histories.isSearching.done} / ${histories.isSearching.total}`}
        </div>
        <ul>
          {historySources.map((source) => (
            <li key={source.id}>
              {source.name}
              &nbsp;
              <button
                type="button"
                onClick={() => {
                  dispatch(dispatchToggleShowDir(source.id));
                }}
              >
                {histories.uriTree[source.id]?.showTree ? 'hide' : 'show'}
              </button>
              <br />
              <ul>
                {histories.uriTree[source.id] &&
                histories.uriTree[source.id].showTree
                  ? R.values(histories.uriTree[source.id].fileBranches).map(
                      (file: FileTree) => {
                        const fileName = file.fullPath.base;
                        const fileUrl = url.pathToFileURL(
                          path.format(file.fullPath)
                        );
                        let link = <span />;
                        if (
                          fileName.endsWith('htm') ||
                          fileName.endsWith('html')
                        ) {
                          link = (
                            <Link
                              to={{
                                pathname: routes.HISTORY,
                                search: new URLSearchParams({
                                  fullPath: fileURLToPath(fileUrl),
                                }).toString(),
                              }}
                            >
                              (view)
                            </Link>
                          );
                        }
                        // eslint-disable-next-line react/jsx-indent
                        return (
                          <li key={source.id + path.format(file.fullPath)}>
                            {file.hasMatch ? '*' : '_'}
                            &nbsp;
                            {fileName}
                            &nbsp;
                            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                            <a
                              href="#"
                              onClick={(event) => {
                                event.preventDefault();
                                electron.shell.openExternal(fileUrl.toString());
                              }}
                            >
                              (open)
                            </a>
                            &nbsp;
                            {link}
                          </li>
                        );
                      }
                    )
                  : ''}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
