import React from 'react';
import { Link } from 'react-router-dom';
import routes from '../../constants/routes.json';

export default function Genealogy() {
  // eslint-disable-next-line global-require
  require('features/genealogy/js/d3.min.js');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line global-require
  require('features/genealogy/js/tree.js');
  // eslint-disable-next-line global-require
  require('features/genealogy/js/tree_ds.js');

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
        <h3 className="person_name">Sample Name</h3>
        <div className="viewer" />
      </div>
    </div>
  );
}
