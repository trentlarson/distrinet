/* eslint react/jsx-props-no-spreading: off */
import React from 'react';
import { Switch, Route } from 'react-router-dom';
import routes from './constants/routes.json';
import App from './containers/App';
import HomePage from './containers/HomePage';

// Lazily load routes and code split with webpack
const LazyCounterPage = React.lazy(() =>
  import(/* webpackChunkName: "CounterPage" */ './containers/CounterPage')
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CounterPage = (props: Record<string, any>) => (
  <React.Suspense fallback={<h1>Loading...</h1>}>
    <LazyCounterPage {...props} />
  </React.Suspense>
);

const LazyDirectoryDiffPage = React.lazy(() =>
  import(
    /* webpackChunkName: "DirectoryDiffPage" */ './features/distnet/DirectoryDiffPage'
  )
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DirectoryDiffPage = (props: Record<string, any>) => (
  <React.Suspense fallback={<h1>Loading...</h1>}>
    <LazyDirectoryDiffPage {...props} />
  </React.Suspense>
);

const LazyDistnetPage = React.lazy(() =>
  import(/* webpackChunkName: "DistnetPage" */ './features/distnet/DistnetPage')
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DistnetPage = (props: Record<string, any>) => (
  <React.Suspense fallback={<h1>Loading...</h1>}>
    <LazyDistnetPage {...props} />
  </React.Suspense>
);

const LazyFileDiffPage = React.lazy(() =>
  import(
    /* webpackChunkName: "FileDiffPage" */ './features/distnet/FileDiffPage'
  )
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FileDiffPage = (props: Record<string, any>) => (
  <React.Suspense fallback={<h1>Loading...</h1>}>
    <LazyFileDiffPage {...props} />
  </React.Suspense>
);

const LazyGenealogyPage = React.lazy(() =>
  import(
    /* webpackChunkName: "GenealogyPage" */ './features/genealogy/GenealogyPage'
  )
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GenealogyPage = (props: Record<string, any>) => (
  <React.Suspense fallback={<h1>Loading...</h1>}>
    <LazyGenealogyPage {...props} />
  </React.Suspense>
);

const LazyGenealogySettingsPage = React.lazy(() =>
  import(
    /* webpackChunkName: "GenealogySettingsPage" */ './features/genealogy/GenealogySettings'
  )
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GenealogySettingsPage = (props: Record<string, any>) => (
  <React.Suspense fallback={<h1>Loading...</h1>}>
    <LazyGenealogySettingsPage {...props} />
  </React.Suspense>
);

const LazyHelpPage = React.lazy(() =>
  import(/* webpackChunkName: "HelpPage" */ './features/distnet/HelpPage')
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HelpPage = (props: Record<string, any>) => (
  <React.Suspense fallback={<h1>Loading...</h1>}>
    <LazyHelpPage {...props} />
  </React.Suspense>
);

const LazyHistoriesPage = React.lazy(() =>
  import(
    /* webpackChunkName: "HistoriesPage" */ './features/histories/HistoriesPage'
  )
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HistoriesPage = (props: Record<string, any>) => (
  <React.Suspense fallback={<h1>Loading...</h1>}>
    <LazyHistoriesPage {...props} />
  </React.Suspense>
);

const LazyHistoryPage = React.lazy(() =>
  import(
    /* webpackChunkName: "HistoryPage" */ './features/histories/HistoryPage'
  )
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HistoryPage = (props: Record<string, any>) => (
  <React.Suspense fallback={<h1>Loading...</h1>}>
    <LazyHistoryPage {...props} />
  </React.Suspense>
);

const LazyTaskListsPage = React.lazy(() =>
  import(
    /* webpackChunkName: "TaskListsPage" */ './features/task-lists/TaskListsPage'
  )
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TaskListsPage = (props: Record<string, any>) => (
  <React.Suspense fallback={<h1>Loading...</h1>}>
    <LazyTaskListsPage {...props} />
  </React.Suspense>
);

export default function Routes() {
  return (
    <App>
      <Switch>
        <Route path={routes.COUNTER} component={CounterPage} />
        <Route path={routes.DIRECTORY_DIFF} component={DirectoryDiffPage} />
        <Route path={routes.DISTNET} component={DistnetPage} />
        <Route path={routes.FILE_DIFF} component={FileDiffPage} />
        <Route path={routes.GENEALOGY} component={GenealogyPage} />
        <Route
          path={routes.GENEALOGY_SETTINGS}
          component={GenealogySettingsPage}
        />
        <Route path={routes.HELP} component={HelpPage} />
        <Route path={routes.HISTORIES} component={HistoriesPage} />
        <Route path={routes.HISTORY} component={HistoryPage} />
        <Route path={routes.TASK_LISTS} component={TaskListsPage} />
        {/* This HomePage Route must come last: any Route after it won't do anything if clicked. */}
        <Route path={routes.HOME} component={HomePage} />
      </Switch>
    </App>
  );
}
