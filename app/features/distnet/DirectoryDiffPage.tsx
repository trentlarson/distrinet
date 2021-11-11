import path from 'path';
import * as R from 'ramda';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import url from 'url';

import routes from '../../constants/routes.json';
import { RootState } from '../../store';
import styles from './Distnet.css';
import { ChangedFile } from './distnetClasses';

export default function DirectoryDiffPage(props: Record<string, any>) {
  const distnet = useSelector((state: RootState) => state.distnet);

  const [sourceWorkPath, setSourceWorkPath] = useState('');
  const [changedFiles, setChangedFiles] = useState([] as Array<ChangedFile>);

  useEffect(() => {
    // Why did it infinitely reload when I setChangedFiles outside a useEffect?

    if (props.location && props.location.search) {
      const params = new URLSearchParams(props.location.search);
      const sourceId = params.get('sourceId');

      const source = R.find((s) => s.id === sourceId, distnet.settings.sources);
      if (sourceId && source) {
        setSourceWorkPath(url.fileURLToPath(source.workUrl));

        const { fileCache } = distnet.cache[sourceId];
        setChangedFiles(fileCache);
      } else {
        console.log('Source not found with ID', sourceId);
      }
    }
  }, [props, distnet.cache, distnet.settings.sources]);

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
        {changedFiles.map((chFile) => (
          <ul key={chFile.file}>
            <li>
              <span>{chFile.file}</span>
              &nbsp;
              <Link
                to={{
                  pathname: routes.FILE_DIFF,
                  search: new URLSearchParams({
                    workPath: path.join(sourceWorkPath, chFile.file),
                  }).toString(),
                }}
              >
                <i title="See Diffs" className="fas fa-align-left" />
              </Link>
            </li>
          </ul>
        ))}
      </div>
    </div>
  );
}
