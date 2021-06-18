import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

// imports for this app
import routes from '../../constants/routes.json';
import { RootState } from '../../store';
import { setFsSessionId } from './genealogySlice';

export default function GenealogySettings() {
  const dispatch = useDispatch();

  const fsSessionId: string = useSelector(
    (state: RootState) => state.genealogy.fsSessionId
  );

  return (
    <div>
      <div data-tid="backButton">
        <Link to={routes.GENEALOGY}>
          <i className="fa fa-arrow-left fa-3x" />
        </Link>
      </div>

      <div className="container">
        <h2 className="title">Settings</h2>
        <hr className="hr" />
        FS Session ID
        {fsSessionId}
        <br />
        ... set: &nbsp;
        <input
          type="text"
          size={40}
          value={fsSessionId}
          onChange={(event) => {
            dispatch(setFsSessionId(event.target.value));
          }}
        />
      </div>
    </div>
  );
}
