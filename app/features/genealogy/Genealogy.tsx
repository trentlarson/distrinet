import React from 'react';
import { Link } from 'react-router-dom';
import routes from '../../constants/routes.json';

require('features/genealogy/js/d3.min.js');
require('features/genealogy/js/tree_ds.js');
const tree = require('features/genealogy/js/tree.js');

export default function Genealogy() {
  // Get Query parameters
  function getQueryParams() {
    const vars = [];
    let hash;
    const hashes = window.location.href
      .slice(window.location.href.indexOf('?') + 1)
      .split('&');
    for (let i = 0; i < hashes.length; i++) {
      hash = hashes[i].split('=');
      vars.push(hash[0]);
      vars[hash[0]] = hash[1];
    }
    // Set a default location just for fun
    if (vars.id == undefined)
      vars.id =
        'https://raw.githubusercontent.com/misbach/familytree/master/people/KWCJ-RN4/KWCJ-RN4.json';
    // if (vars.id == undefined) vars.id = "file:///Users/tlarson/backed-martin-rigby-default/Martin/KWCC-9SJ/KWCC-9SJ.json";
    return vars;
  }
  const params = getQueryParams();

  // Walk tree for ancestors and descendants
  tree.getTree(params.id, {
    id: params.id,
    name: null,
    _parents: [],
    _children: [],
  });

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
