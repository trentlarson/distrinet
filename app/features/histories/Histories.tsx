import * as R from 'ramda';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import routes from '../../constants/routes.json';
import { RootState } from '../../store';
import { dispatchLoadDir, FileInfo } from './historiesSlice';
import styles from './style.css';

export default function Histories() {
  const distnet = useSelector((state: RootState) => state.distnet);
  const historySources = R.filter(
    (s) => s.id.startsWith('histories'),
    distnet.settings.sources
  );
  const dispatch = useDispatch();

  const histories = useSelector((state: RootState) => state.histories);

  return (
    <div>
      <div className={styles.backButton} data-tid="backButton">
        <Link to={routes.HOME}>
          <i className="fa fa-arrow-left fa-3x" />
        </Link>
      </div>
      <div className={styles.sign} data-tid="sign">
        Histories
      </div>
      <div className={styles.histories}>
        <ul>
          {historySources.map((source) => (
            <li key={source.id}>
              {source.name}
              &nbsp;
              <button
                type="button"
                onClick={() => {
                  dispatch(dispatchLoadDir(source.id));
                }}
              >
                reload
              </button>
              <br />
              <ul>
                {histories.display[source.id]
                  ? histories.display[source.id].map((file: FileInfo) => (
                      // eslint-disable-next-line react/jsx-indent
                      <li key={source.id + file.name}>{file.name}</li>
                    ))
                  : ''}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
