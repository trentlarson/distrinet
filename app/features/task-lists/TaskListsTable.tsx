import child_process from 'child_process';
import * as R from 'ramda';
import React, { useState } from 'react';
import ReactHtmlParser from 'react-html-parser';
import { useDispatch, useSelector } from 'react-redux';
import { AppThunk, RootState } from '../../store';
import { Cache, ResourceTypes, Source } from '../distnet/distnetClasses';
import { findClosestUriForGlobalUri } from '../distnet/uriTools';
import {
  clearForecastData,
  DEFAULT_HOURS_PER_WEEK,
  DEFAULT_TASK_COMMENT,
  dispatchLoadOneSourceIntoTasks,
  dispatchToggleDependentExpansionUi,
  dispatchToggleSubtaskExpansionUi,
  dispatchVolunteer,
  isTaskyamlUriScheme,
  labelValueInSummary,
  retrieveForecast,
} from './taskListsSlice';
import {
  areLinkedTasksExpanded,
  UiTree,
  UiTreeBranch,
  UiTreeProperty,
  UiTreeLinkageProperty,
  YamlTask,
} from './util';
import style from './style.css';

const child = child_process.execFile;

function execProtocolApp(execPath: string, args: Array<string>) {
  child(execPath, args, (err, data) => {
    // This runs after the app is closed.
    console.log('Executable data:', data);
    console.error('Executable error:', err);
  });
}

/**
 * return a button for "copy" labels; otherwise, the non-null value or ''
 */
/** I don't know what this is for.  (Note that return type is "Element | string".)
function labelValueRendering(label: string, summary: string) {
  const value = labelValueInSummary(label, summary);
  if (label === 'copy' && value && value.length > 0) {
    return <button type="button">{value}</button>;
  }
  return R.isNil(value) ? '' : value;
}
* */

function sourceActions(
  dispatch: (arg0: AppThunk) => void,
  cache: Cache,
  taskSources: Array<Source>,
  resourceTypes: ResourceTypes,
  hoursPerWeek: number,
  setHoursPerWeek: (arg0: number) => void,
  focusOnTaskId: string,
  setFocusOnTaskId: (arg0: string) => void,
  taskSigningComment: string,
  setTaskSigningComment: (arg0: string) => void,
  listSourceIdsToShow: Array<string>,
  setListSourceIdsToShow: (arg0: Array<string>) => void
) {
  return (
    <div>
      <table>
        <thead>
          <tr>
            <td />
            <td>
              <button
                type="button"
                onClick={() => {
                  if (listSourceIdsToShow.length === 0) {
                    setListSourceIdsToShow(taskSources.map((s) => s.id));
                  } else {
                    setListSourceIdsToShow([]);
                  }
                }}
              >
                Toggle
              </button>
            </td>
          </tr>
        </thead>
        <tbody>
          {taskSources.map((source) => {
            const protocol = source.id.substring(0, source.id.indexOf(':'));
            const execPath =
              resourceTypes && resourceTypes[protocol]?.executablePath;
            const file = cache[source.id]?.localFile;
            /** I cannot figure out how to fix this stupid error. */
            /** eslint-disable-next-line react/jsx-curly-newline */
            return (
              <tr key={source.id}>
                <td>{source.name || '(unknown)'}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => {
                      if (R.any(R.equals(source.id), listSourceIdsToShow)) {
                        // remove it from the sources we're showing
                        setListSourceIdsToShow(
                          R.without([source.id], listSourceIdsToShow)
                        );
                      } else {
                        // add it to the sources we're showing
                        setListSourceIdsToShow(
                          R.union(listSourceIdsToShow, [source.id])
                        );
                      }
                    }}
                    style={{
                      backgroundColor: R.any(
                        R.equals(source.id),
                        listSourceIdsToShow
                      )
                        ? 'grey'
                        : 'white',
                    }}
                  >
                    Show
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    onClick={
                      () =>
                        dispatch(
                          retrieveForecast(
                            source.id,
                            hoursPerWeek,
                            focusOnTaskId
                          )
                        )
                      // This is soooo stupid that there's an error-level lint rule about this!
                      // ... and that it gives you an error if you put it on the previous line.
                      // eslint-disable-next-line react/jsx-curly-newline
                    }
                  >
                    Forecast
                  </button>
                </td>
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
                  {cache[source.id]
                    ? cache[source.id].updatedDate
                    : '(not loaded)'}
                </td>
                <td>
                  <button
                    type="button"
                    onClick={
                      () => dispatch(dispatchLoadOneSourceIntoTasks(source.id))
                      // This is soooo stupid that there's an error-level lint rule about this!
                      // ... and that it gives you an error if you put it on the previous line.
                      // eslint-disable-next-line react/jsx-curly-newline
                    }
                  >
                    Reload
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
        value={hoursPerWeek}
        onChange={(e) => setHoursPerWeek(parseInt(e.target.value, 10))}
      />
      &nbsp;hrs/wk and focused on issue ID&nbsp;
      <input
        size={20}
        type="text"
        value={focusOnTaskId}
        onChange={(e) => setFocusOnTaskId(e.target.value)}
      />
      )
      <br />
      (Task signatures will contain this comment:
      <input
        size={40}
        type="text"
        value={taskSigningComment}
        onChange={(e) => setTaskSigningComment(e.target.value)}
      />
      )
    </div>
  );
}

function oneTaskRow(
  task: YamlTask,
  index: number,
  hoursPerWeek: number,
  taskSigningComment: string,
  taskSources: Array<Source>,
  labelsToShow: Array<string>,
  setListSourceIdsToShow: (arg0: Array<string>) => void,
  setFocusOnTaskId: (arg0: string) => void,
  uiTreePath: Array<UiTreeBranch>,
  allUiTrees: Record<string, Array<UiTree>>,
  dispatch: (arg0: AppThunk) => void
) {
  const sourceMap = R.fromPairs(R.map((s) => [s.id, s], taskSources));
  const subtaskUiTreePath = R.concat(uiTreePath, [
    { index, path: UiTreeLinkageProperty.SUBTASKS },
  ]);
  const areSubtasksExpanded = areLinkedTasksExpanded(
    subtaskUiTreePath,
    allUiTrees[task.sourceId],
    UiTreeProperty.SUBTASKS_EXP
  );
  const dependentUiTreePath = R.concat(uiTreePath, [
    { index, path: UiTreeLinkageProperty.DEPENDENTS },
  ]);
  const areDependentsExpanded = areLinkedTasksExpanded(
    dependentUiTreePath,
    allUiTrees[task.sourceId],
    UiTreeProperty.DEPENDENTS_EXP
  );
  // eslint-disable-next-line react/no-array-index-key
  return (
    <tr key={`${task.sourceId}/${index}`}>
      <td>{index > 0 ? '' : sourceMap[task.sourceId].name}</td>
      <td>{Number.isFinite(task.priority) ? task.priority : '-'}</td>
      <td>{Number.isFinite(task.estimate) ? task.estimate : '-'}</td>
      {labelsToShow.map((label) => {
        const labelValue = labelValueInSummary(label, task.summary);
        let more = <span />;
        if (label === 'ref' && labelValue && isTaskyamlUriScheme(labelValue)) {
          const newUri = findClosestUriForGlobalUri(
            labelValue,
            R.map(R.prop('id'), taskSources)
          );
          if (newUri != null) {
            /* eslint-disable jsx-a11y/anchor-is-valid */
            /* eslint-disable jsx-a11y/click-events-have-key-events */
            /* eslint-disable jsx-a11y/no-static-element-interactions */
            more = (
              <a
                onClick={() => {
                  setListSourceIdsToShow([newUri]);
                  setFocusOnTaskId('');
                  dispatch(retrieveForecast(newUri, hoursPerWeek, ''));
                }}
              >
                (visit)
              </a>
            );
            /* eslint-enable */
          }
        }
        return (
          <td key={label}>
            {labelValue}
            &nbsp;
            {more}
          </td>
        );
      })}
      <td>
        {task.summary}
        <br />
        {task.subtasks.length > 0 ? (
          <span>
            <button
              type="button"
              className={style.subtask}
              onClick={() => {
                dispatch(
                  dispatchToggleSubtaskExpansionUi(
                    task.sourceId,
                    subtaskUiTreePath,
                    allUiTrees
                  )
                );
              }}
            >
              {areSubtasksExpanded ? '<' : '>'}
            </button>
            {areSubtasksExpanded ? (
              // eslint-disable-next-line  @typescript-eslint/no-use-before-define
              smallListTable(
                [task.subtasks],
                hoursPerWeek,
                taskSigningComment,
                taskSources,
                labelsToShow,
                setListSourceIdsToShow,
                setFocusOnTaskId,
                subtaskUiTreePath,
                allUiTrees,
                dispatch
              )
            ) : (
              <span />
            )}
          </span>
        ) : (
          <span />
        )}
      </td>
      <td>
        {task.dependents.length > 0 ? (
          <span>
            <button
              type="button"
              className={style.subtask}
              onClick={() => {
                dispatch(
                  dispatchToggleDependentExpansionUi(
                    task.sourceId,
                    dependentUiTreePath,
                    allUiTrees
                  )
                );
              }}
            >
              {areDependentsExpanded ? '<' : '>'}
            </button>
            {areDependentsExpanded ? (
              // eslint-disable-next-line  @typescript-eslint/no-use-before-define
              smallListTable(
                [task.dependents],
                hoursPerWeek,
                taskSigningComment,
                taskSources,
                labelsToShow,
                setListSourceIdsToShow,
                setFocusOnTaskId,
                dependentUiTreePath,
                allUiTrees,
                dispatch
              )
            ) : (
              <span />
            )}
          </span>
        ) : (
          <span />
        )}
      </td>
      <td>
        <button
          type="button"
          onClick={() => {
            dispatch(dispatchVolunteer(task, taskSigningComment));
          }}
        >
          Volunteer
        </button>
      </td>
    </tr>
  );
}

function smallListTable(
  activityLists: Array<Array<YamlTask>>,
  hoursPerWeek: number,
  taskSigningComment: string,
  taskSources: Array<Source>,
  labelsToShow: Array<string>,
  setListSourceIdsToShow: (arg0: Array<string>) => void,
  setFocusOnTaskId: (arg0: string) => void,
  uiTreePath: Array<UiTreeBranch>,
  allUiTrees: Record<string, Array<UiTree>>,
  dispatch: (arg0: AppThunk) => void
) {
  return (
    <table style={{border: '1px solid'}}>
      <thead>
        <tr>
          <th>Project</th>
          <th>Prty</th>
          <th>
            Est
            <br />
            <sub>
              log
              <sub>2</sub>
            </sub>
          </th>
          {labelsToShow.map((label) => (
            <th key={label}>{label}</th>
          ))}
          <th>Summary</th>
          <th>Dep</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {activityLists.map((activityList) =>
          activityList.map((task: YamlTask, index: number) =>
            oneTaskRow(
              task,
              index,
              hoursPerWeek,
              taskSigningComment,
              taskSources,
              labelsToShow,
              setListSourceIdsToShow,
              setFocusOnTaskId,
              uiTreePath,
              allUiTrees,
              dispatch
            )
          )
        )}
      </tbody>
    </table>
  );
}

function bigListTable(
  dispatch: (arg0: AppThunk) => void,
  taskSources: Array<Source>,
  hoursPerWeek: number,
  taskSigningComment: string,
  setFocusOnTaskId: (arg0: string) => void,
  setListSourceIdsToShow: (arg0: Array<string>) => void,
  labelsToShow: Array<string>,
  setLabelsToShow: (arg0: Array<string>) => void,
  showOnlyTop3: boolean,
  setShowOnlyTop3: (arg0: boolean) => void,
  allUiTrees: Record<string, Array<UiTree>>,
  showLists: Record<string, Array<YamlTask>>,
  allLabels: Array<string>
) {
  return R.keys(showLists).length === 0 ? (
    <span />
  ) : (
    <div>
      <hr />
      <h4>All Activities</h4>
      <input
        type="checkbox"
        checked={showOnlyTop3}
        onChange={() => {
          setShowOnlyTop3(!showOnlyTop3);
        }}
      />
      Show only the top 3 of each list.
      <br />
      Labels:
      {allLabels.map((label) => (
        <button
          type="button"
          key={label}
          onClick={() => {
            if (R.any(R.equals(label), labelsToShow)) {
              // remove it from the labels we're showing
              setLabelsToShow(R.without([label], labelsToShow));
            } else {
              // add it to the labels we're showing
              setLabelsToShow(R.union(labelsToShow, [label]));
            }
          }}
          style={{
            backgroundColor: R.any(R.equals(label), labelsToShow)
              ? 'grey'
              : 'white',
          }}
        >
          {label}
        </button>
      ))}
      {smallListTable(
        R.keys(showLists).map((sourceId) =>
          R.take(
            showOnlyTop3 ? 3 : showLists[sourceId].length,
            showLists[sourceId]
          )
        ),
        hoursPerWeek,
        taskSigningComment,
        taskSources,
        labelsToShow,
        setListSourceIdsToShow,
        setFocusOnTaskId,
        [],
        allUiTrees,
        dispatch
      )}
    </div>
  );
}

export default function TaskListsTable() {
  const dispatch = useDispatch();
  const taskLists = useSelector((state: RootState) => state.taskLists);
  const distnet = useSelector((state: RootState) => state.distnet);
  const resourceTypes = useSelector(
    (state: RootState) => state.distnet.settings.resourceTypes
  );
  const [listSourceIdsToShow, setListSourceIdsToShow] = useState(
    [] as Array<string>
  );
  const [hoursPerWeek, setHoursPerWeek] = useState(DEFAULT_HOURS_PER_WEEK);
  const [focusOnTaskId, setFocusOnTaskId] = useState('');
  const [taskSigningComment, setTaskSigningComment] = useState(
    DEFAULT_TASK_COMMENT
  );
  const [labelsToShow, setLabelsToShow] = useState([] as Array<string>);
  const [showOnlyTop3, setShowOnlyTop3] = useState(false);

  let allLabels: Array<string> = [];

  let showLists = {} as Record<string, Array<YamlTask>>;
  if (taskLists) {
    if (taskLists.allLists && R.keys(taskLists.allLists).length > 0) {
      showLists = R.pick(listSourceIdsToShow, taskLists.allLists);

      // loop through and post-process, eg. to find all the labels
      const oneBigList = R.flatten(R.values(showLists));
      for (let i = 0; i < oneBigList.length; i += 1) {
        const pairs = R.filter(
          R.test(/:/),
          R.split(' ', oneBigList[i].summary)
        );
        if (pairs.length > 0) {
          const validKeys = R.filter(
            R.test(/^[A-Za-z0-9_-]*$/),
            R.map((item) => R.split(':', item)[0], pairs)
          );
          allLabels = R.union(allLabels, validKeys).sort();
        }
      }
      // Since it's possible that a source got removed,
      // ensure that all showing labels are only ones found in allLabels.
      if (!R.all((label) => R.any(R.equals(label), allLabels), labelsToShow)) {
        // only doing it conditionally to avoid (infinite?) rerenders
        setLabelsToShow(R.intersection(labelsToShow, allLabels));
      }
    }
  }

  const taskSources: Array<Source> = R.filter(
    (s) => isTaskyamlUriScheme(s.id),
    distnet.settings.sources
  );

  return (
    <div>
      <br />
      <br />
      <br />
      <div>
        {sourceActions(
          dispatch,
          distnet.cache,
          taskSources,
          resourceTypes,
          hoursPerWeek,
          setHoursPerWeek,
          focusOnTaskId,
          setFocusOnTaskId,
          taskSigningComment,
          setTaskSigningComment,
          listSourceIdsToShow,
          setListSourceIdsToShow
        )}
      </div>
      <div>
        {taskLists.forecastData.html.length > 0 ? (
          <div>
            <hr />
            <h4>
              {
                R.find(
                  (s) => s.id === taskLists.forecastData.sourceId,
                  taskSources
                )?.name
              }
              &nbsp;Forecast
            </h4>
            <button
              type="button"
              onClick={() => {
                setFocusOnTaskId('');
                dispatch(clearForecastData());
              }}
            >
              Remove
            </button>
            {ReactHtmlParser(taskLists.forecastData.html)}
          </div>
        ) : (
          ''
        )}
      </div>
      {bigListTable(
        dispatch,
        taskSources,
        hoursPerWeek,
        taskSigningComment,
        setFocusOnTaskId,
        setListSourceIdsToShow,
        labelsToShow,
        setLabelsToShow,
        showOnlyTop3,
        setShowOnlyTop3,
        taskLists.display,
        showLists,
        allLabels
      )}
    </div>
  );
}
