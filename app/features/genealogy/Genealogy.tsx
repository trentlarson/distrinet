import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../../store';
import routes from '../../constants/routes.json';
import { setRootUri } from './genealogySlice';

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

        <GenealogyView />
      </div>
    </div>
  );
}

function GenealogyView() {
  const dispatch = useDispatch();

  const cache = useSelector((state: RootState) => state.distnet.cache);
  tree.setCache(cache);

  const rootUri: string = useSelector(
    (state: RootState) => state.genealogy.rootUri
  );
  // Walk tree for ancestors and descendants
  tree.getTree(rootUri);

  return (
    <div>
      <div>
        URI &nbsp;
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
