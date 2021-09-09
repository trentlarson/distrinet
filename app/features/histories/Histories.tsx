import child_process from 'child_process';
import electron from 'electron';
import path from 'path';
import * as R from 'ramda';
import React, { Dispatch, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import GridLoader from 'react-spinners/GridLoader';
import url, { URLSearchParams, fileURLToPath } from 'url';

import routes from '../../constants/routes.json';
import { RootState } from '../../store'; // eslint-disable-line import/no-cycle
import { Source } from '../distnet/distnetClasses';
import {
  addDragDropListeners,
  dispatchAddHistoryToSettings,
  resourceTypesForUris,
} from '../distnet/distnetSlice';
import {
  dispatchCountSearchable,
  dispatchEraseSearchResults,
  dispatchLoadHistoryDirsIfEmpty,
  dispatchToggleShowDir,
  dispatchTextSearch,
  FileTree,
  SearchProgress,
} from './historiesSlice';
import styles from './style.css';

const { execFile } = child_process;

enum Visibility {
  visible = 'visible',
  hidden = 'hidden',
}

/* eslint-disable @typescript-eslint/no-use-before-define */

export default function Histories() {
  const distnet = useSelector((state: RootState) => state.distnet);
  const dispatch = useDispatch();

  dispatch(dispatchLoadHistoryDirsIfEmpty());

  const historySources = R.filter(
    (s) => s.id.startsWith('histories:'),
    distnet.settings.sources
  );

  const droppableRef = useRef<HTMLDivElement>(null);

  const [idInputExpanded, setIdInputExpanded] = useState(Visibility.hidden);
  const [idSearchTerm, setIdSearchTerm] = useState('');

  // histories.uriTree will be empty on initial load, before the paths are built
  const histories = useSelector((state: RootState) => state.histories);

  const addCallback = (filePath: string) =>
    dispatchAddHistoryToSettings(filePath);
  useEffect(() => {
    const element = droppableRef.current;
    if (element) {
      addDragDropListeners(element, addCallback, dispatch);
    }
  });

  return (
    <div ref={droppableRef}>
      <div className={styles.backButton} data-tid="backButton">
        <Link to={routes.HOME}>
          <i className="fa fa-arrow-left fa-3x" />
        </Link>
      </div>
      <div className="container">
        <br />
        <br />
        <br />
        <h2>Shared Histories</h2>
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
          <span style={{ visibility: idInputExpanded }}>
            <input
              type="text"
              size={32}
              onChange={(event) => {
                setIdSearchTerm(event.target.value);
              }}
              onKeyUp={(event) => {
                if (event.keyCode === 13) {
                  // 13 = enter key
                  setIdInputExpanded(Visibility.hidden);
                  if (idSearchTerm.length > 0) {
                    dispatch(dispatchCountSearchable());
                    dispatch(dispatchTextSearch(idSearchTerm));
                  } else {
                    dispatch(dispatchEraseSearchResults());
                  }
                }
              }}
            />
            &nbsp;(hit Enter)
          </span>
        </div>
        <div>{idSearchTerm ? `Results for: ${idSearchTerm}` : ''}</div>
        <div
          style={{ visibility: isSearchingVisible(histories.searchProgress) }}
        >
          <GridLoader color="silver" />
          {`${histories.searchProgress.done} / ${histories.searchProgress.total}`}
        </div>
        <ul>
          {historySources.map((source) =>
            histories.uriTree[source.id] ? (
              <HistoryDir
                key={source.id}
                name={source.name || histories.uriTree[source.id].fullPath.base}
                source={source}
                tree={histories.uriTree[source.id]}
                treePath={[source.id]}
              />
            ) : (
              <span key={source.id} />
            )
          )}
        </ul>
        <div>* = found results</div>
      </div>
    </div>
  );
}

function isSearchingVisible(historiesIsSearching: SearchProgress) {
  return historiesIsSearching.done < historiesIsSearching.total
    ? Visibility.visible
    : Visibility.hidden;
}

interface DirProps {
  name: string;
  source: Source;
  tree: FileTree;
  treePath: Array<string>;
}

export function HistoryDir(props: DirProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dispatch: Dispatch<any> = useDispatch();
  const { name, source, tree, treePath } = props;
  const goodName = name || tree.fullPath.base;

  let dirExpandButton = <span />;
  if (tree.isDir) {
    dirExpandButton = (
      <button
        type="button"
        onClick={() => {
          dispatch(dispatchToggleShowDir(treePath));
        }}
      >
        {tree.showTree ? '<' : '>'}
      </button>
    );
  }

  const fileUrl = url.pathToFileURL(path.format(tree.fullPath));

  let viewLink = <span />;
  const { base } = tree.fullPath;
  if (base.endsWith('htm') || base.endsWith('html')) {
    viewLink = (
      <Link
        to={{
          pathname: routes.HISTORY,
          search: new URLSearchParams({
            fullPath: fileURLToPath(fileUrl),
          }).toString(),
        }}
      >
        (inspect)
      </Link>
    );
  }

  const openLink = (
    // eslint-disable-next-line jsx-a11y/anchor-is-valid
    <a
      href="#"
      onClick={(event) => {
        event.preventDefault();
        electron.shell.openExternal(fileUrl.toString());
      }}
    >
      (open)
    </a>
  );

  const dragLink = <a href={fileUrl.toString()}>(drag)</a>;

  const resourceTypes = useSelector(
    (state: RootState) => state.distnet.settings.resourceTypes
  );
  const resources = resourceTypesForUris([name], resourceTypes);
  const moreLinks = (
    <span>
      {resources.map((res) => (
        // eslint-disable-next-line jsx-a11y/anchor-is-valid
        <a
          href="#"
          key={res.matcher}
          onClick={(event) => {
            event.preventDefault();
            execProtocolApp(res.executablePath, [fileURLToPath(fileUrl)]);
          }}
        >
          {/* This is funny... or stupid: try taking off this eslint-disable and fix and you'll get into an infinite loop. */}
          {/* eslint-disable-next-line react/jsx-one-expression-per-line, prettier/prettier */}
          ({res.executablePath.split(path.sep).slice(-1)})
        </a>
      ))}
    </span>
  );

  return (
    <li key={source.id}>
      {tree.hasMatch ? '*' : ''}
      &nbsp;
      {goodName}
      &nbsp;
      {dirExpandButton}
      &nbsp;
      {viewLink}
      &nbsp;
      {openLink}
      &nbsp;
      {dragLink}
      &nbsp;
      {moreLinks}
      <br />
      {tree.showTree ? (
        <ul>
          {R.values(tree.fileBranches).map((file: FileTree) => (
            <HistoryDir
              key={file.fullPath.base}
              name={file.fullPath.base}
              source={source}
              tree={file}
              treePath={R.concat(treePath, [file.fullPath.base])}
            />
          ))}
        </ul>
      ) : (
        ''
      )}
    </li>
  );
}

function execProtocolApp(execPath: string, args: Array<string>) {
  execFile(execPath, args); // accepts third arg as callback after app is closed: (err, data) => {...}
}
