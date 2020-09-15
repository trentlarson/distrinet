import path from 'path';
import * as R from 'ramda';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import GridLoader from 'react-spinners/GridLoader';
import routes from '../../constants/routes.json';
import { RootState } from '../../store';
import {
  dispatchEraseSearchResults,
  dispatchLoadDir,
  dispatchTextSearch,
  FileInfo,
  SearchProgress,
} from './historiesSlice';
import styles from './style.css';

function isSearchingVisible(historiesIsSearching: SearchProgress) {
  return historiesIsSearching.done < historiesIsSearching.total
    ? 'visible'
    : 'hidden';
}

export default function Histories() {
  const distnet = useSelector((state: RootState) => state.distnet);
  const historySources = R.filter(
    (s) => s.id.startsWith('histories'),
    distnet.settings.sources
  );
  const dispatch = useDispatch();
  const [idInputExpanded, setIdInputExpanded] = useState('hidden');
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
              setIdInputExpanded('visible');
            }}
          >
            Search for ID
          </button>
          <input
            type="text"
            size={32}
            style={{ visibility: idInputExpanded }}
            onChange={(event) => {
              setIdSearchTerm(event.target.value);
              setIdInputExpanded('hidden');
              if (event.target.value) {
                dispatch(dispatchTextSearch(event.target.value));
              } else {
                dispatch(dispatchEraseSearchResults());
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
                  dispatch(dispatchLoadDir(source.id));
                }}
              >
                reload
              </button>
              <br />
              <ul>
                {histories.display[source.id]
                  ? histories.display[source.id].map((file: FileInfo) => {
                      const fileName = path.basename(file.fullPath);
                      // eslint-disable-next-line react/jsx-indent
                      return (
                        <li key={source.id + file.fullPath}>
                          {file.hasMatch ? '*' : '_'}
                          {fileName}
                        </li>
                      );
                    })
                  : ''}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
