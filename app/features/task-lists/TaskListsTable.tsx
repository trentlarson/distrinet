import child_process from 'child_process';
import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Task } from './taskListsSlice';

const child = child_process.execFile;

function execProtocolApp(execPath: string, args: Array<string>) {
  child(execPath, args, (err, data) => {
    console.log('Executable data:', data);
    console.log('Executable error:', err);
  });
}

export default function TaskListsTable() {
  const taskLists = useSelector((state: RootState) => state.taskLists);
  const resourceTypes = useSelector(
    (state: RootState) => state.distnet.settings.resourceTypes
  );

  let bigList: Array<Task> = [];
  let execLink = <span />;
  if (taskLists) {
    bigList = taskLists.bigList;
    if (bigList && bigList.length > 0) {
      const { sourceId } = bigList[0];
      const protocol = sourceId.substring(0, sourceId.indexOf(':'));
      if (
        resourceTypes &&
        resourceTypes[protocol] &&
        resourceTypes[protocol].executablePath
      ) {
        const execPath = resourceTypes[protocol].executablePath;
        const TEST_PATH = '/Users/tlarson/dev/home/dist-task-lists/tasks.yml';
        execLink = (
          <button
            type="button"
            onClick={() => execProtocolApp(execPath, [TEST_PATH])}
          >
            Execute
          </button>
        );
      }
    }
  }

  return (
    <div>
      {execLink}
      <table>
        <tbody>
          {bigList &&
            bigList.map((task: Task) => (
              // Note that you must change this "random" to a real index if you modify this list.
              <tr key={`${task.sourceId}/${Math.random()}`}>
                <td>{task.sourceId}</td>
                <td>{task.priority.toString()}</td>
                <td>{task.estimate.toString()}</td>
                <td>{task.description}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
