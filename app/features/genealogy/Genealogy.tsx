import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../../store';
import routes from '../../constants/routes.json';

require('features/genealogy/js/d3.min.js');
require('features/genealogy/js/tree_ds.js');
const tree = require('features/genealogy/js/tree.js');

export default function Genealogy() {
  const cache = useSelector((state: RootState) => state.distnet.cache);

  // Walk tree for ancestors and descendants
  tree.setCache(cache);
  // tree.getTree(tree.getQueryParams().id);
  tree.getTree('gedcomx-indi:04bf12b0-cecd-11ea-8dda-f73921453c09-LH8M-TX3');

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
