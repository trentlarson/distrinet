import child_process from 'child_process';
import * as R from 'ramda';
import React, { useState } from 'react';
import ReactHtmlParser from 'react-html-parser';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Source } from '../distnet/distnetClasses';
import { Task, isTaskyamlSource, retrieveForecast } from './taskListsSlice';

const child = child_process.execFile;

function execProtocolApp(execPath: string, args: Array<string>) {
  child(execPath, args, (err, data) => {
    // This runs after the app is closed.
    console.log('Executable data:', data);
    console.error('Executable error:', err);
  });
}

export default function TaskListsTable() {
  const dispatch = useDispatch();
  const taskLists = useSelector((state: RootState) => state.taskLists);
  const distnet = useSelector((state: RootState) => state.distnet);
  const resourceTypes = useSelector(
    (state: RootState) => state.distnet.settings.resourceTypes
  );
  const [hoursPerWeek, setHoursPerWeek] = useState(40);

  let bigList: Array<Task> = [];
  let execSources = <span />;
  let sourceMap: Record<string, Source> = {};
  if (taskLists) {
    if (taskLists.bigList && taskLists.bigList.length > 0) {
      bigList = taskLists.bigList;
    }

    const taskSources = R.filter(
      (s) => isTaskyamlSource(s.id),
      distnet.settings.sources
    );
    sourceMap = R.fromPairs(R.map((s) => [s.id, s], taskSources));

    execSources = (
      <div>
        <ul>
          {taskSources.map((source) => {
            const protocol = source.id.substring(0, source.id.indexOf(':'));
            const execPath = resourceTypes[protocol]?.executablePath;
            const file = distnet.cache[source.id]?.localFile;
            /** I cannot figure out how to fix this stupid error. */
            /** eslint-disable-next-line react/jsx-curly-newline */
            return (
              <li key={source.id}>
                {source.name}
                &nbsp;
                {execPath ? (
                  <button
                    type="button"
                    onClick={() => execProtocolApp(execPath, [file])}
                  >
                    Open Copy
                  </button>
                ) : (
                  <span />
                )}
                &nbsp;
                <button
                  type="button"
                  onClick={
                    () => dispatch(retrieveForecast(source.id, hoursPerWeek))
                    // This is soooo stupid that there's an error-level lint rule about this!
                    // eslint-disable-next-line react/jsx-curly-newline
                  }
                >
                  Forecast
                </button>
              </li>
            );
          })}
        </ul>
        (Note: forecasts are estimated at
        <input
          size="1"
          type="text"
          defaultValue={hoursPerWeek}
          onChange={(e) => setHoursPerWeek(parseInt(e.target.value, 10))}
        />
        hrs/wk)
      </div>
    );
  }

  return (
    <div>
      <div>{execSources}</div>
      <div>{ReactHtmlParser(taskLists.forecastHtml)}</div>
      {bigList.length > 0 ? (
        <div>
          <h4>All Tasks</h4>
          <table>
            <tbody>
              {bigList &&
                bigList.map((task: Task, index: number) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={`${task.sourceId}/${index}`}>
                    <td>{sourceMap[task.sourceId].name}</td>
                    <td>{task.priority?.toString()}</td>
                    <td>{task.estimate?.toString()}</td>
                    <td>{task.description}</td>
                    <td>
                      {task.children.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            console.log('Child tasks', task.children);
                            return '';
                          }}
                        >
                          children
                        </button>
                      ) : (
                        <span />
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <span />
      )}
    </div>
  );
}
