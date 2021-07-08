import electron from 'electron';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

// imports for this app
import routes from '../../constants/routes.json';
import { RootState } from '../../store';
import { resetIdMappings, setFsSessionId } from './genealogySlice';

export default function GenealogySettings() {
  const dispatch = useDispatch();

  const fsSessionId: string = useSelector(
    (state: RootState) => state.genealogy.fsSessionId
  );

  const { shell } = electron;

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
        {fsSessionId ? (
          <span>
            FamilySearch Session ID: &nbsp;
            {fsSessionId}
          </span>
        ) : (
          <span />
        )}
        <br />
        <span>
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid,jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
          <a
            onClick={() =>
              shell.openExternal('https://www.familysearch.org/platform/')
            } // eslint-disable-line react/jsx-curly-newline
            // ... and I have no idea how to fix that eslint.
          >
            Click here to get a new FamilySearch Session ID
          </a>
        </span>
        <br />
        ... and paste it here:&nbsp;
        <input
          type="text"
          size={40}
          value={fsSessionId}
          onChange={(event) => {
            dispatch(setFsSessionId(event.target.value));
          }}
        />
        <br />
        <br />
        <br />
        <button
          onClick={() => {
            dispatch(resetIdMappings());
          }}
          data-tclass="btn"
          type="button"
        >
          Clear ID cache
        </button>
      </div>
    </div>
  );
}
