import child_process from 'child_process';
import * as R from 'ramda';
import React, { useState } from 'react';
import ReactHtmlParser from 'react-html-parser';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Source } from '../distnet/distnetClasses';
import {
  Task,
  isTaskyamlSource,
  retrieveForecast,
  setForecastHtml,
} from './taskListsSlice';

const child = child_process.execFile;

function execProtocolApp(execPath: string, args: Array<string>) {
  child(execPath, args, (err, data) => {
    // This runs after the app is closed.
    console.log('Executable data:', data);
    console.error('Executable error:', err);
  });
}

/**
 * return the value for the given label if in the description; otherwise, ''
 */
function labelValueInDescription(label: string, description: string) {
  const pairs = R.filter(R.test(/:/), R.split(' ', description));
  const pair = R.find((str) => str.startsWith(`${label}:`), pairs);
  return pair ? R.splitAt(pair.indexOf(':') + 1, pair)[1] : '';
}

export default function TaskListsTable() {
  const dispatch = useDispatch();
  const taskLists = useSelector((state: RootState) => state.taskLists);
  const distnet = useSelector((state: RootState) => state.distnet);
  const resourceTypes = useSelector(
    (state: RootState) => state.distnet.settings.resourceTypes
  );
  const [hoursPerWeek, setHoursPerWeek] = useState(40);
  const [labelsToShow, setLabelsToShow] = useState([] as Array<string>);

  let bigList: Array<Task> = [];
  let allLabels: Array<string> = [];
  let execSources = <span />;
  let sourceMap: Record<string, Source> = {};
  if (taskLists) {
    if (taskLists.bigList && taskLists.bigList.length > 0) {
      bigList = taskLists.bigList;

      // process, eg. to find all the labels
      for (let i = 0; i < bigList.length; i += 1) {
        const pairs = R.filter(
          R.test(/:/),
          R.split(' ', bigList[i].description)
        );
        if (pairs.length > 0) {
          const validKeys = R.filter(
            R.test(/^[A-Za-z0-9_-]*$/),
            R.map((item) => R.split(':', item)[0], pairs)
          );
          allLabels = R.concat(allLabels, validKeys).sort();
        }
      }
    }

    const taskSources = R.filter(
      (s) => isTaskyamlSource(s.id),
      distnet.settings.sources
    );
    sourceMap = R.fromPairs(R.map((s) => [s.id, s], taskSources));

    execSources = (
      <div>
        <table>
          <tbody>
            {taskSources.map((source) => {
              const protocol = source.id.substring(0, source.id.indexOf(':'));
              const execPath = resourceTypes[protocol]?.executablePath;
              const file = distnet.cache[source.id]?.localFile;
              /** I cannot figure out how to fix this stupid error. */
              /** eslint-disable-next-line react/jsx-curly-newline */
              return (
                <tr key={source.id}>
                  <td>{source.name}</td>
                  <td>
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
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={
                        () =>
                          dispatch(retrieveForecast(source.id, hoursPerWeek))
                        // This is soooo stupid that there's an error-level lint rule about this!
                        // eslint-disable-next-line react/jsx-curly-newline
                      }
                    >
                      Forecast
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        (Forecasts are estimated at&nbsp;
        <input
          size={2}
          type="text"
          defaultValue={hoursPerWeek}
          onChange={(e) => setHoursPerWeek(parseInt(e.target.value, 10))}
        />
        &nbsp;hrs/wk)
      </div>
    );
  }

  return (
    <div>
      <div>{execSources}</div>
      <div>
        {taskLists.forecastHtml.length > 0 ? (
          <div>
            <h4>Forecast</h4>
            <button type="button" onClick={() => dispatch(setForecastHtml(''))}>
              Remove
            </button>
            {ReactHtmlParser(taskLists.forecastHtml)}
          </div>
        ) : (
          ''
        )}
      </div>
      {bigList.length > 0 ? (
        <div>
          <h4>All Tasks</h4>
          Labels:
          {allLabels.map((label) => (
            <button
              type="button"
              key={label}
              onClick={() => {
                if (R.any(R.identical(label), labelsToShow)) {
                  // remove it from the labels we're showing
                  setLabelsToShow(R.without([label], labelsToShow));
                } else {
                  // add it to the labels we're showing
                  setLabelsToShow(R.union(labelsToShow, [label]));
                }
              }}
              style={{
                backgroundColor: R.any(R.identical(label), labelsToShow)
                  ? 'grey'
                  : 'white',
              }}
            >
              {label}
            </button>
          ))}
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Prty</th>
                <th>Est</th>
                {labelsToShow.map((label) => (
                  <th key={label}>{label}</th>
                ))}
                <th>Description</th>
                <th>Subtasks (to log)</th>
              </tr>
            </thead>
            <tbody>
              {bigList &&
                bigList.map((task: Task, index: number) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={`${task.sourceId}/${index}`}>
                    <td>{sourceMap[task.sourceId].name}</td>
                    <td>{task.priority?.toString()}</td>
                    <td>{task.estimate?.toString()}</td>
                    {labelsToShow.map((label) => (
                      <td key={label}>
                        {labelValueInDescription(label, task.description)}
                      </td>
                    ))}
                    <td>{task.description}</td>
                    <td>
                      {task.subtasks.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            console.log('Subtasks', task.subtasks);
                            return '';
                          }}
                        >
                          subtasks
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
