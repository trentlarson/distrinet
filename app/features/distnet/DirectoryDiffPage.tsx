import path from 'path';
import * as R from 'ramda';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import url from 'url';

import routes from '../../constants/routes.json';
import styles from './Distnet.css';
import { historyDestFullPathFromPaths } from './history';

export default function DirectoryDiffPage(props: Record<string, any>) {

  const distnet = useSelector((state: RootState) => state.distnet);

  const [sourceId, setSourceId] = useState('');
  const [sourceWorkPath, setSourceWorkPath] = useState('');
  const [changedFiles, setChangedFiles] = useState([]);

  useEffect(() => {
    // Why did it infinitely reload when I setChangedFiles outside a useEffect?

    if (props.location && props.location.search) {
      const params = new URLSearchParams(props.location.search);
      const thisSourceId = params.get('sourceId');
      setSourceId(thisSourceId);

      const source = R.find((s) => s.id === thisSourceId, distnet.settings.sources); // eslint-disable-line max-len,prettier/prettier
      if (source) {
        setSourceWorkPath(url.fileURLToPath(source.workUrl));

        const fileCache = distnet.cache[thisSourceId].fileCache;
        setChangedFiles(fileCache);
      } else {
        console.log('Source not found with ID', thisSourceId);
      }
    }
  }, [props]);

  return (
    <div>
      <div className={styles.backButton} data-tid="backButton">
        <Link to={routes.DISTNET}>
          <i className="fa fa-arrow-left fa-3x" />
        </Link>
      </div>
      <div>
        <br />
        <br />
        <br />
        <h2>Nested Changes</h2>
        <br />
        {changedFiles.map((chFile) =>
          <ul key={chFile.file}>
            <li>
              <span>{chFile.file}</span>
              &nbsp;
              <Link
                to={{
                  pathname: routes.FILE_DIFF,
                  search: new URLSearchParams({
                    workPath: sourceWorkPath,
                    relativePath: chFile.file,
                  }).toString(),
                }}
              >
                <i title="See Diffs" className="fas fa-align-left" />
              </Link>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}