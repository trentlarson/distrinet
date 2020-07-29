import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../../store';
import routes from '../../constants/routes.json';
import { setRootUri } from './genealogySlice';

require('features/genealogy/js/d3.min.js');
const treeDs = require('features/genealogy/js/tree_ds.js');
const tree = require('features/genealogy/js/tree.js');

export default function Genealogy() {
  const cache = useSelector((state: RootState) => state.distnet.cache);
  tree.setCache(cache);

  const rootUri = useSelector((state: RootState) => state.genealogy.rootUri);
  const dispatch = useDispatch();

  treeDs.addListener({
    treeUrlPrefix: '#/genealogy',
    svgWidth: 1200,
    svgHeight: 600,
  });

  // Walk tree for ancestors and descendants
  let personUri = '';
  if (tree.getQueryParams().id) {
    console.log('personUri from params', tree.getQueryParams().id);
    personUri = tree.getQueryParams().id;
  } else if (rootUri) {
    console.log('personUri from rootUri', rootUri);
    personUri = rootUri;
  } else {
    console.log('personUri is', personUri);
  }
  tree.getTree(personUri);

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

        <div>
          URI
          <input
            type="text"
            size={100}
            defaultValue={personUri}
            onChange={(event) => {
              dispatch(setRootUri(event.target.value));
            }}
          />
        </div>

        <h3 className="person_name">Name Placeholder</h3>
        <div className="viewer" />
      </div>
    </div>
  );
}
