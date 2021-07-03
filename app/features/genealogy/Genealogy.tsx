import electron from 'electron';
import process from 'process';
import * as R from 'ramda';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

// imports for this app
import { RootState } from '../../store';
import routes from '../../constants/routes.json';
import {
  addSourceToSettings,
  dispatchModifySettings,
  dispatchSaveSettingsTextToFile,
} from '../distnet/distnetSlice';
import { Cache, Source } from '../distnet/distnetClasses';
import uriTools from '../distnet/uriTools';
import { setCorrelatedIdsRefreshedMillis, setRootUri } from './genealogySlice';
import MapperBetweenSets from './samePerson';

require('features/genealogy/js/d3.min.js'); // v 3.5.5
const treeDs = require('features/genealogy/js/tree_ds.js');
const treeFun = require('features/genealogy/js/tree.js');

interface TreeOption {
  tree: {
    setSources(sources: Array<Source>): void;
    getTree(rootUri: string): void;
    getQueryParams(): Record<string, string>;
  };
}

export default function Genealogy() {
  const fsSessionId: string = useSelector(
    (state: RootState) => state.genealogy.fsSessionId
  );

  // if we see problems with 'remote', maybe fix deprecation: https://www.electronjs.org/docs/api/remote
  if (electron.remote.session) {
    const cookie = {
      url: 'https://api.familysearch.org',
      name: 'fssessionid',
      value: fsSessionId || process.env.FSSESSIONID,
    };
    // if we see problems with 'remote', maybe fix deprecation: https://www.electronjs.org/docs/api/remote
    electron.remote.session.defaultSession.cookies
      .set(cookie)
      .then(() => {
        // success
        // console.log('Set fssessionid cookie:', cookie.value);
        return null;
      })
      .catch((error) => {
        console.error('Error setting fssessionid cookie:', error);
      });
  }

  treeDs.addListener({
    treeUrlPrefix: '#/genealogy',
    svgWidth: 1200,
    svgHeight: 400,
    newWindow: (url: string) => {
      // open a new window
      window.open(url);
    },
    // refreshWindow: Couldn't figure it out.
    // Other things are available if you import 'electron', eg webFrame.context.location.getURL(),
    // but I couldn't get anything to actually set the existingpage to the new URL.
  });

  const pageUri = treeFun.getQueryParams().id || '';
  const dispatch = useDispatch();
  if (pageUri) {
    // This causes the following error:
    // "Cannot update a component from inside the function body of a different component."
    // ... but it seems to do everything right.  What's the correct way?
    // Look here for answers: http://stackoverflow.com/questions/36596996/ddg#36657751
    dispatch(setRootUri(pageUri));
  }

  return (
    <div>
      <div data-tid="backButton">
        <Link to={routes.HOME}>
          <i className="fa fa-arrow-left fa-3x" />
        </Link>
      </div>

      <div className="container">
        <h2 className="title">Decentralized Tree</h2>
        <Link to={routes.GENEALOGY_SETTINGS}>Settings</Link>
        <hr className="hr" />

        <GenealogyView tree={treeFun} />
      </div>
    </div>
  );
}

function GenealogyView(options: TreeOption) {
  const dispatch = useDispatch();

  const cache: Cache = useSelector((state: RootState) => state.distnet.cache);

  const correlatedIdsRefreshedMillis: number = useSelector(
    (state: RootState) => state.genealogy.correlatedIdsRefreshedMillis
  );
  // update DB if there are newer cache items
  MapperBetweenSets.refreshIfNewer(
    correlatedIdsRefreshedMillis,
    cache,
    (millis) => dispatch(setCorrelatedIdsRefreshedMillis(millis))
  );

  const sources: Array<Source> = useSelector(
    (state: RootState) => state.distnet.settings.sources
  );
  options.tree.setSources(sources);

  const rootUri: string = useSelector(
    (state: RootState) => state.genealogy.rootUri
  );
  // Walk tree for ancestors and descendants
  options.tree.getTree(rootUri);

  const droppableRef = useRef()
  useEffect(() => {
    addDragDropListeners(droppableRef.current, dispatch, setRootUri);
  });

  /* eslint-disable no-alert */
  return (
    <div ref={droppableRef}>
      <div>
        Source: &nbsp;
        {rootUri}
        &nbsp;
        <ChangeRootUriInput />
        <br />
        <OfferToSaveIfNew rootUri={rootUri} />
      </div>

      <h3 className="person_name">&nbsp;</h3>
      <div className="viewer" />
    </div>
  );
}

// Drag & Drop a repo (similar code found in histories feature)

// I usually see the drag-drop code fire twice (and I've even see it dozens of time with one drag).
// So these are to guard against those possibilities.
let timestampOfLastDrop = 0;
let lastFile = '';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addDragDropListeners = (elem: HTMLElement, dispatch, setRootUri) => {
  // from https://www.geeksforgeeks.org/drag-and-drop-files-in-electronjs/

  elem.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.dataTransfer || event.dataTransfer.files.length !== 1) {
      // Technically there's no problem adding more, but we should add more confirmations if they do this
      // because the typical case is to only have one ID per repo. I worry about people dragging files by mistake.
      alert('We only support adding one folder at a time.');
    } else {
      const filePath = event.dataTransfer.files[0].path;
      if (
        filePath === lastFile &&
        new Date().getTime() - timestampOfLastDrop < 5000
      ) {
        console.log('Got a duplicate event: ', event);
      } else {
        timestampOfLastDrop = new Date().getTime();
        lastFile = filePath;
        dispatch(setRootUri('file://' + filePath))
      }
    }
  });

  elem.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // There are also 'dragenter' and 'dragleave' events which may help to trigger visual indications.

};

enum Visibility {
  visible = 'visible',
  hidden = 'hidden',
}

function getVisibility(isVisible: boolean) {
  return isVisible ? Visibility.visible : Visibility.hidden;
}

function ChangeRootUriInput() {
  const dispatch = useDispatch();

  const [rootUriInputExpanded, setRootUriInputExpanded] = useState(false);
  const [rootUriInput, setRootUriInput] = useState('');

  const inputRef = React.useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  });

  return (
    <span>
      <span style={{ visibility: getVisibility(!rootUriInputExpanded) }}>
        <button
          type="button"
          onClick={() => {
            setRootUriInput('');
            setRootUriInputExpanded(true);
          }}
        >
          Change
        </button>
      </span>
      <span style={{ visibility: getVisibility(rootUriInputExpanded) }}>
        <br />
        URI &nbsp;
        <input
          type="text"
          size={32}
          ref={inputRef}
          onChange={(event) => {
            setRootUriInput(event.target.value.trim());
          }}
          onKeyUp={(event) => {
            if (event.keyCode === 13) {
              // 13 = enter key
              setRootUriInputExpanded(false);
              if (rootUriInput.length > 0) {
                dispatch(setRootUri(rootUriInput));
              }
            } else if (event.keyCode === 27) {
              // 27 = escape
              setRootUriInputExpanded(false);
            }
          }}
        />
        &nbsp;(hit Enter)
      </span>
    </span>
  );
}

interface SaveOptions {
  rootUri: string;
}

/**
 * If it's local data then check against all known URIs, and
 * if it's not known then prompt user to add it to the settings
 * especially so we can add it to our known IDs and cache the contents.
 */
function OfferToSaveIfNew(options: SaveOptions) {
  const { rootUri } = options;

  let addToSettings = <span />;

  const dispatch = useDispatch();
  const sources: Array<Source> = useSelector(
    (state: RootState) => state.distnet.settings.sources
  );
  let newUrlText = rootUri;
  if (rootUri && uriTools.isGlobalUri(rootUri)) {
    const newUrl = new URL(rootUri);
    newUrl.search = '';
    newUrl.hash = '';
    newUrlText = newUrl.toString();
  }
  const newId = R.replace(/^file:\/\//, 'gedcomx:', newUrlText);
  const newName = 'Local ' + newUrlText.replace(/[\/\\]/g, ' ')

  const [settingsId, setSettingsId] = useState(newId);
  if (settingsId === '' && newId !== '') {
    setSettingsId(newId);
  }
  const [settingsName, setSettingsName] = useState(newName);
  if (settingsName === '' && newName !== '') {
    setSettingsName(newName);
  }
  const [settingsUrl, setSettingsUrl] = useState(newUrlText);
  if (settingsUrl === '' && newUrlText !== '') {
    setSettingsUrl(newUrlText);
  }

  if (uriTools.isUriLocalhost(rootUri)) {
    const sourceWithPrefix = R.find((s) => rootUri.startsWith(s.id), sources);
    let sourceUrlWithPrefix = null;
    if (!sourceWithPrefix) {
      const allUrls = R.flatten(sources.map((s) => s.urls.map((u) => u.url)));
      sourceUrlWithPrefix = R.find((u) => rootUri.startsWith(u), allUrls);
    }
    if (!sourceWithPrefix && !sourceUrlWithPrefix) {
      addToSettings = (
        <span>
          <br />
          <button
            type="button"
            onClick={() => {
              const newSource = {
                id: settingsId,
                name: settingsName,
                urls: [{ url: settingsUrl }],
              };
              dispatch(dispatchModifySettings(addSourceToSettings(newSource)));
              dispatch(dispatchSaveSettingsTextToFile());
              dispatch(setRootUri(settingsId));
              setSettingsId('')
              setSettingsName('')
              setSettingsUrl('')
            }}
          >
            Click to add this to your permanent settings:
          </button>
          <br />
          Name &nbsp;
          <input
            type="text"
            size={100}
            defaultValue={settingsName}
            onChange={(event) => {
              setSettingsName(event.target.value);
            }}
          />
          <br />
          ID &nbsp;
          <input
            type="text"
            size={100}
            defaultValue={settingsId}
            onChange={(event) => {
              setSettingsId(event.target.value);
            }}
          />
          <br />
          Loc &nbsp;
          <input
            type="text"
            size={100}
            defaultValue={settingsUrl}
            onChange={(event) => {
              setSettingsUrl(event.target.value);
            }}
          />
          <br />
          <button
            type="button"
            onClick={() => {
              dispatch(setRootUri(''))
              setSettingsId('')
              setSettingsName('')
              setSettingsUrl('')
            }}>
            Cancel
          </button>
        </span>
      );
    }
  }
  return addToSettings;
}
