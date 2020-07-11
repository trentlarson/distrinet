import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Task } from './taskListsSlice';

export default function TaskListsTable() {
  const taskLists = useSelector((state: RootState) => state.taskLists);
  return (
    <table>
      <tbody>
        {taskLists &&
          taskLists.bigList &&
          taskLists.bigList.map((task: Task) => (
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
  );
}
