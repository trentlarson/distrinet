import electron from 'electron';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../../store';
import routes from '../../constants/routes.json';
import { Cache } from '../distnet/distnetClasses';
import { setRootUri } from './genealogySlice';
import MapperBetweenSets from './samePerson';

if (electron.remote.session) {
  const fsSessionId = '461459cc-2d07-4297-bb29-97acdd1d879c-prod';
  const cookie = {
    url: 'https://api.familysearch.org',
    name: 'fssessionid',
    value: fsSessionId,
  };
  electron.remote.session.defaultSession.cookies
    .set(cookie)
    /**
    .then(() => {
      // success
      console.error("Set fssession cookie:", fsSessionId)
    })
    */
    .catch((error) => {
      console.error('Error setting fssession cookie:', error);
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
    // refreshWindow: Couldn't figure it out. Other things are available if you import 'electron', eg webFrame.context.location.getURL(), but I couldn't get anything to actually set the existingpage to the new URL.
  });

  const pageUri = tree.getQueryParams().id || '';
  const dispatch = useDispatch();
  if (pageUri) {
    // This causes the following error:
    // "Cannot update a component from inside the function body of a different component."
    // ... but it seems to do everything right.  What's the correct way?
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
        <h2 className="title">
          <img src="features/genealogy/images/logo.png" alt="" />
          Decentralized Distributed Tree
        </h2>
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
  MapperBetweenSets.refreshIfNewer(correlatedIdsRefreshedMillis, cache);

  options.tree.setCache(cache);

  const rootUri: string = useSelector(
    (state: RootState) => state.genealogy.rootUri
  );
  // Walk tree for ancestors and descendants
  options.tree.getTree(rootUri);

  const help = `
    Sample URIs:
      https://raw.githubusercontent.com/misbach/familytree/master/people/KWCJ-RN4/KWCJ-RN4.json
      gedcomx:04bf12b0-cecd-11ea-8dda-f73921453c09#KGY4-8D5
  `;

  /* Can't wait to remove the alert and make a good UI! */
  /* eslint-disable no-alert */
  return (
    <div>
      <div>
        URI
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
      </div>

      <h3 className="person_name">&nbsp;</h3>
      <div className="viewer" />
    </div>
  );
}
