import React from 'react';
import { Link } from 'react-router-dom';
import routes from '../../constants/routes.json';

export default function GenealogySettings() {
  return (
    <div>
      <div data-tid="backButton">
        <Link to={routes.GENEALOGY}>
          <i className="fa fa-arrow-left fa-3x" />
        </Link>
      </div>
      Boo!
    </div>
  );
}
