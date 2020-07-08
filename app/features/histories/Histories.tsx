import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import styles from './style.css';
import routes from '../../constants/routes.json';

export default function Histories() {
  const distnet = useSelector((state: RootState) => state.distnet);
  const sourcesNum = distnet.settings.sources
    ? distnet.settings.sources.length
    : 0;
  const sourcesCountText = `${sourcesNum} source${sourcesNum === 1 ? '' : 's'}`;
  return (
    <div>
      <div className={styles.backButton} data-tid="backButton">
        <Link to={routes.HOME}>
          <i className="fa fa-arrow-left fa-3x" />
        </Link>
      </div>
      <div className={`sign ${styles.sign}`} data-tid="sign">
        {sourcesCountText}
      </div>
    </div>
  );
}
