import electron from 'electron';
import process from 'process';
import * as R from 'ramda';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../../store';
import routes from '../../constants/routes.json';
import {
  addSourceToSettings,
  dispatchModifySettings,
  dispatchSaveSettingsTextToFile,
} from '../distnet/distnetSlice';
import { Cache, Source } from '../distnet/distnetClasses';
import uriTools from '../distnet/uriTools';
import {
  setCorrelatedIdsRefreshedMillis,
  setFsSessionId,
  setRootUri,
} from './genealogySlice';
import MapperBetweenSets from './samePerson';

if (electron.remote.session) {
  const cookie = {
    url: 'https://api.familysearch.org',
    name: 'fssessionid',
    value: process.env.FSSESSIONID,
  };
  electron.remote.session.defaultSession.cookies
    .set(cookie)
    .then(() => {
      // success
      console.error('Set fssessionid cookie:', cookie.value);
      return null;
    })
    .catch((error) => {
      console.error('Error setting fssessionid cookie:', error);
    });
}

interface TreeOption {
  tree: {
    setCache(cache: Cache): void;
    getTree(rootUri: string): void;
    getQueryParams(): Record<string, string>;
  };
}

require('features/genealogy/js/d3.min.js'); // v 3.5.5
const treeDs = require('features/genealogy/js/tree_ds.js');
const tree = require('features/genealogy/js/tree.js');

export default function Genealogy() {
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

  const pageUri = tree.getQueryParams().id || '';
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
        <hr className="hr" />

        <GenealogyView tree={tree} />
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

  options.tree.setCache(cache);

  const fsSessionId: string = useSelector(
    (state: RootState) => state.genealogy.fsSessionId
  );

  const rootUri: string = useSelector(
    (state: RootState) => state.genealogy.rootUri
  );
  // Walk tree for ancestors and descendants
  options.tree.getTree(rootUri);

  const help = `
    Sample URIs:
      https://raw.githubusercontent.com/misbach/familytree/master/people/KWCJ-RN4/KWCJ-RN4.json
      gedcomx:68bcddaa-3fef-4830-af04-aa8a88781a17#KGY4-8D5
      https://api.familysearch.org/platform/tree/persons/KWHH-HSW
  `;

  /* eslint-disable no-alert */
  return (
    <div>
      <div>
        URI
        {/* Can't wait to remove this alert and make a good UI! */}
        <button type="button" onClick={() => alert(help)}>
          (?)
        </button>
        &nbsp;
        {rootUri}
        <br />
        <input
          type="text"
          size={100}
          onChange={(event) => {
            dispatch(setRootUri(event.target.value));
          }}
        />
        <br />
        FS Session ID
        <input
          type="text"
          size={40}
          value={fsSessionId}
          onChange={(event) => {
            dispatch(setFsSessionId(event.target.value));
            const cookie = {
              url: 'https://api.familysearch.org',
              name: 'fssessionid',
              value: event.target.value,
            };
            electron.remote.session.defaultSession.cookies
              .set(cookie)
              .catch((error) => {
                console.error('Error setting fssessionid cookie:', error);
              });
          }}
        />
        <br />
        <OfferToSaveIfNew rootUri={rootUri} />
      </div>

      <h3 className="person_name">&nbsp;</h3>
      <div className="viewer" />
    </div>
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
  const newId = R.replace(/^file:/, 'gedcomx:file:', newUrlText);

  const [settingsId, setSettingsId] = useState(newId);
  if (settingsId === '' && newId !== '') {
    setSettingsId(newId);
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
                urls: [{ url: settingsUrl }],
              };
              dispatch(dispatchModifySettings(addSourceToSettings(newSource)));
              dispatch(dispatchSaveSettingsTextToFile());
            }}
          >
            Click to add this to your permanent settings:
          </button>
          <br />
          ID
          <input
            type="text"
            size={100}
            defaultValue={settingsId}
            onChange={(event) => {
              setSettingsId(event.target.value);
            }}
          />
          <br />
          Loc
          <input
            type="text"
            size={100}
            defaultValue={settingsUrl}
            onChange={(event) => {
              setSettingsUrl(event.target.value);
            }}
          />
        </span>
      );
    }
  }
  return addToSettings;
}
