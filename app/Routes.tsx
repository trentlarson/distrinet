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

const CounterPage = (props: Record<string, any>) => (
  <React.Suspense fallback={<h1>Loading...</h1>}>
    <LazyCounterPage {...props} />
  </React.Suspense>
);

const LazyDistnetPage = React.lazy(() =>
  import(/* webpackChunkName: "DistnetPage" */ './features/distnet/DistnetPage')
);

const DistnetPage = (props: Record<string, any>) => (
  <React.Suspense fallback={<h1>Loading...</h1>}>
    <LazyDistnetPage {...props} />
  </React.Suspense>
);

const LazyGenealogyPage = React.lazy(() =>
  import(
    /* webpackChunkName: "GenealogyPage" */ './features/genealogy/GenealogyPage'
  )
);

const GenealogyPage = (props: Record<string, any>) => (
  <React.Suspense fallback={<h1>Loading...</h1>}>
    <LazyGenealogyPage {...props} />
  </React.Suspense>
);

export default function Routes() {
  return (
    <App>
      <Switch>
        <Route path={routes.COUNTER} component={CounterPage} />
        <Route path={routes.DISTNET} component={DistnetPage} />
        <Route path={routes.GENEALOGY} component={GenealogyPage} />
        {/* This HomePage Route must come last: any Route after it won't do anything if clicked. */}
        <Route path={routes.HOME} component={HomePage} />
      </Switch>
    </App>
  );
}
