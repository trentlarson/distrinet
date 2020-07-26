import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../../store';
import routes from '../../constants/routes.json';

require('features/genealogy/js/d3.min.js');
const treeDs = require('features/genealogy/js/tree_ds.js');
const tree = require('features/genealogy/js/tree.js');

export default function Genealogy() {
  const cache = useSelector((state: RootState) => state.distnet.cache);

  treeDs.addListener({
    treeUrlPrefix: '#/genealogy',
    refreshWindow: (url: string) => {
      // switch the display to the new URL
      window.open(url); // opens a new window because I can't figure anything better yet
      // Other things are available if you import 'electron', eg webFrame.context.location.getURL(), but I couldn't get anything to actually set the page to the new URL.
    },
  });

  // Walk tree for ancestors and descendants
  tree.setCache(cache);
  tree.getTree(tree.getQueryParams().id);
  // tree.getTree('gedcomx-indi:04bf12b0-cecd-11ea-8dda-f73921453c09-LH8M-TX3');

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
        <h3 className="person_name">Name Placeholder</h3>
        <div className="viewer" />
      </div>
    </div>
  );
}
