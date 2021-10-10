import child_process from 'child_process';
import Electron from 'electron';
import * as R from 'ramda';
import React, { useEffect, useRef, useState } from 'react';
import ReactHtmlParser from 'react-html-parser';
import { useDispatch, useSelector } from 'react-redux';
import SyncLoader from 'react-spinners/SyncLoader';
import URL from 'url';

import { AppThunk, RootState } from '../../store';
import { Cache, ResourceType, SourceInternal } from '../distnet/distnetClasses';
import {
  addDragDropListeners,
  dispatchAddTaskListToSettings,
  getSourceForIri,
} from '../distnet/distnetSlice';
import {
  findClosestUriForGlobalUri,
  globalUriForId,
} from '../distnet/uriTools';
import {
  clearForecastData,
  DEFAULT_HOURS_PER_WEEK,
  DEFAULT_TASK_COMMENT,
  dispatchDetermineTopTasks,
  dispatchLoadAllSourcesIntoTasks,
  dispatchLoadOneSourceIntoTasks,
  dispatchToggleDependentExpansionUi,
  dispatchToggleSubtaskExpansionUi,
  dispatchVolunteer,
  getIdValues,
  isTaskyamlUriScheme,
  labelValueInSummary,
  REF_LABEL_KEY,
  retrieveForecast,
} from './taskListsSlice';
import {
  areLinkedTasksExpanded,
  lastSignificantChars,
  onlyBiggest5,
  UiTree,
  UiTreeBranch,
  UiTreeProperty,
  UiTreeLinkageProperty,
  YamlTask,
} from './util';
import style from './style.css';

const { execFile } = child_process;

/* eslint-disable @typescript-eslint/no-use-before-define */

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
  const [showOnlyBiggest5, setShowOnlyBiggest5] = useState(false);
  const [calculatingLinkedTasks, setCalculatingLinkedTasks] = useState(false);

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

  const taskSources: Array<SourceInternal> = R.filter(
    (s) => !!s.id && isTaskyamlUriScheme(s.id),
    distnet.settings.sources
  );

  const droppableRef = useRef(null);
  const addCallback = async (filePath: string) => {
    await dispatch(dispatchAddTaskListToSettings(filePath));
    await dispatch(dispatchLoadAllSourcesIntoTasks());
  };
  useEffect(() => {
    const element = droppableRef.current; // all to make typechecking pass
    if (element) {
      addDragDropListeners(element, addCallback, dispatch);
    }
  });

  return (
    <div>
      <br />
      <br />
      <br />
      <div className="container">
        <h2 className="title">Shared Projects</h2>
      </div>
      <br />
      <br />
      <div ref={droppableRef}>
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
        <hr />
        Report&nbsp;
        <button
          type="button"
          onClick={async () => {
            setCalculatingLinkedTasks(true);
            await dispatch(dispatchDetermineTopTasks());
            setCalculatingLinkedTasks(false);
          }}
        >
          Find Top Links
        </button>
        {calculatingLinkedTasks ? <SyncLoader color="silver" /> : <span />}
        <div>
          <ul>
            {taskLists.linkedTasks.map(([key, number]) => {

              const taskSourceIds = R.filter(
                (sid) => R.startsWith(sid, key),
                R.keys(taskLists.allLists)
              );
              // I have IRIs that are paths under others, so only select the most specific.
              const taskSourceId = R.last(
                R.sort((s) => s.length, taskSourceIds)
              );
              let taskSourceName = '';
              if (taskSourceId) {
                const taskSource = getSourceForIri(taskSourceId, taskSources);
                if (taskSource && taskSource.name) { // we may not know the source
                  taskSourceName = taskSource.name || '';
                }
              }

              return <li key={key}>
                {taskSourceName}
                &nbsp;-&nbsp;
                {lastSignificantChars(key)}
                &nbsp;
                ({number} reference)
                &nbsp;
                {/* eslint-disable-next-line jsx-a11y/anchor-has-content,jsx-a11y/anchor-is-valid,jsx-a11y/click-events-have-key-events,jsx-a11y/control-has-associated-label,jsx-a11y/interactive-supports-focus */}
                <a
                  className="fa fa-crosshairs"
                  role="button"
                  title="Load"
                  onClick={() => {
                    if (taskSourceId) {
                      setListSourceIdsToShow([taskSourceId]);
                      setFocusOnTaskId(key);
                    } else {
                      // eslint-disable-next-line no-new
                      new Notification('Unknown', {
                        body: `That task is not in any known projects.`,
                        silent: true,
                      });
                    }
                  }}
                />
              </li>
            })}
          </ul>
        </div>
      </div>
      <div>
        {taskLists.forecastData.html.length > 0 ? (
          <div>
            <hr />
            <h4>
              Forecast for&nbsp;
              {
                R.find(
                  (s) => s.id === taskLists.forecastData.sourceId,
                  taskSources
                )?.name
              }
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
        focusOnTaskId,
        setFocusOnTaskId,
        setListSourceIdsToShow,
        labelsToShow,
        setLabelsToShow,
        showOnlyTop3,
        setShowOnlyTop3,
        showOnlyBiggest5,
        setShowOnlyBiggest5,
        taskLists.display,
        showLists,
        allLabels
      )}
    </div>
  );
}

function sourceActions(
  dispatch: (arg0: AppThunk) => void,
  cache: Cache,
  taskSources: Array<SourceInternal>,
  resourceTypes: Array<ResourceType>,
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
              resourceTypes &&
              R.find(
                (type) => source.id.startsWith(`${type.matcher}:`),
                resourceTypes
              )?.executablePath;
            const file = cache[source.id]?.localFile;
            const localFirst = cache[source.id]?.sourceUrl.endsWith(file);
            const dragMessage = `Drag${localFirst ? '' : ' Local'}`;
            /** I cannot figure out how to fix this stupid linting error. */
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
                  <button
                    type="button"
                    onClick={() => {
                      Electron.shell.openExternal(
                        URL.pathToFileURL(file).toString()
                      );
                    }}
                  >
                    Open on System
                  </button>

                  {execPath ? (
                    <button
                      type="button"
                      onClick={() => execProtocolApp(execPath, [file])}
                    >
                      Open&nbsp;
                      {protocol}
                    </button>
                  ) : (
                    <span />
                  )}

                  <a href={file}>{dragMessage}</a>
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

function execProtocolApp(execPath: string, args: Array<string>) {
  execFile(execPath, args); // accepts third arg as callback after app is closed: (err, data) => {...}
}

/**
  a function to please TypeScript
 */
const sameArray: <T>(arr: Array<T>) => Array<T> = R.identity;

function bigListTable(
  dispatch: (arg0: AppThunk) => void,
  taskSources: Array<SourceInternal>,
  hoursPerWeek: number,
  taskSigningComment: string,
  focusOnTaskId: string,
  setFocusOnTaskId: (arg0: string) => void,
  setListSourceIdsToShow: (arg0: Array<string>) => void,
  labelsToShow: Array<string>,
  setLabelsToShow: (arg0: Array<string>) => void,
  showOnlyTop3: boolean,
  setShowOnlyTop3: (arg0: boolean) => void,
  showOnlyBiggest5: boolean,
  setShowOnlyBiggest5: (arg0: boolean) => void,
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
      <input
        type="checkbox"
        checked={showOnlyBiggest5}
        onChange={() => {
          setShowOnlyBiggest5(!showOnlyBiggest5);
        }}
      />
      Show only the biggest 5 of each list.
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
          // selectively apply these functions to the list
          (showOnlyBiggest5 ? onlyBiggest5 : sameArray)(
            (showOnlyTop3 ? R.take(3) : sameArray)(
              showLists[sourceId] // eslint-disable-line prettier/prettier
            )
          )
        ),
        hoursPerWeek,
        taskSigningComment,
        taskSources,
        labelsToShow,
        setListSourceIdsToShow,
        focusOnTaskId,
        setFocusOnTaskId,
        [],
        allUiTrees,
        dispatch
      )}
    </div>
  );
}

function smallListTable(
  activityLists: Array<Array<YamlTask>>,
  hoursPerWeek: number,
  taskSigningComment: string,
  taskSources: Array<SourceInternal>,
  labelsToShow: Array<string>,
  setListSourceIdsToShow: (arg0: Array<string>) => void,
  focusOnTaskId: string,
  setFocusOnTaskId: (arg0: string) => void,
  uiTreePath: Array<UiTreeBranch>,
  allUiTrees: Record<string, Array<UiTree>>,
  dispatch: (arg0: AppThunk) => void
) {
  return (
    <table style={{ border: '1px solid' }}>
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
          <th>&nbsp;</th>
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
              focusOnTaskId,
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

function oneTaskRow(
  task: YamlTask,
  index: number,
  hoursPerWeek: number,
  taskSigningComment: string,
  taskSources: Array<SourceInternal>,
  labelsToShow: Array<string>,
  setListSourceIdsToShow: (arg0: Array<string>) => void,
  focusOnTaskId: string,
  setFocusOnTaskId: (arg0: string) => void,
  uiTreePath: Array<UiTreeBranch>,
  allUiTrees: Record<string, Array<UiTree>>,
  dispatch: (arg0: AppThunk) => void
) {
  // similar to getSourceForIri in distnetSlice
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
  const taskIds = getIdValues(task.summary);
  const globalUris: Array<string> = R.map(
    R.curry(globalUriForId)(R.__, task.sourceId), // eslint-disable-line no-underscore-dangle
    taskIds
  );
  // eslint-disable-next-line react/no-array-index-key
  return (
    <tr key={`${task.sourceId}/${index}`}>
      <td>{index > 0
        ? ''
        : sourceMap[task.sourceId] ? sourceMap[task.sourceId].name : ''}
      </td>
      <td>{Number.isFinite(task.priority) ? task.priority : '-'}</td>
      <td>{Number.isFinite(task.estimate) ? task.estimate : '-'}</td>
      {labelsToShow.map((label) => {
        const labelValue = labelValueInSummary(label, task.summary);
        let more = <span />;
        if (
          label === REF_LABEL_KEY &&
          labelValue &&
          isTaskyamlUriScheme(labelValue)
        ) {
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
      <td
        style={{
          border: R.includes(focusOnTaskId, globalUris)
            ? '5px solid yellow'
            : '',
        }}
      >
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
              {areSubtasksExpanded ? '^' : 'V'}
              <span className={style.tooltiptext}>Subtasks</span>
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
                focusOnTaskId,
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
              <span className={style.tooltiptext}>
                Dependent Tasks (which cannot be started until the previous is
                finished)
              </span>
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
                focusOnTaskId,
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
