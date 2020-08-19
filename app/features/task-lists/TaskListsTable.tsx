import child_process from 'child_process';
import _ from 'lodash';
import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Task, isTaskyamlSource } from './taskListsSlice';

const child = child_process.execFile;

function execProtocolApp(execPath: string, args: Array<string>) {
  child(execPath, args, (err, data) => {
    // This runs after the app is closed.
    console.log('Executable data:', data);
    console.error('Executable error:', err);
  });
}

export default function TaskListsTable() {
  const taskLists = useSelector((state: RootState) => state.taskLists);
  const distnet = useSelector((state: RootState) => state.distnet);
  const resourceTypes = useSelector(
    (state: RootState) => state.distnet.settings.resourceTypes
  );

  let bigList: Array<Task> = [];
  let execSources = <span />;
  if (taskLists) {
    if (taskLists.bigList && taskLists.bigList.length > 0) {
      bigList = taskLists.bigList;
    }

    const taskSources = _.filter(distnet.settings.sources, (s) =>
      isTaskyamlSource(s.id)
    );

    execSources = (
      <ul>
        {taskSources.map((source) => {
          const protocol = source.id.substring(0, source.id.indexOf(':'));
          const execPath =
            resourceTypes[protocol] && resourceTypes[protocol].executablePath;
          const file =
            distnet.cache[source.id] && distnet.cache[source.id].localFile;
          return (
            <li key={source.id}>
              {source.name}
              &nbsp;
              {execPath ? (
                <button
                  type="button"
                  onClick={() => execProtocolApp(execPath, [file])}
                >
                  Open
                </button>
              ) : (
                <span />
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div>
      {execSources}
      <table>
        <tbody>
          {bigList &&
            bigList.map((task: Task, index: number) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={`${task.sourceId}/${index}`}>
                <td>{task.sourceId}</td>
                <td>{task.priority.toString()}</td>
                <td>{task.estimate.toString()}</td>
                <td>{task.description}</td>
                <td>
                  {task.children ? (
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
                    ''
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
