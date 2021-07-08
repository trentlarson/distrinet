import { mount } from 'enzyme';
import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';

// imports in this app
import Counter from '../../../app/features/counter/Counter';
import * as distnetSlice from '../../../app/features/distnet/distnetSlice';

function setup() {
  const store = configureStore({
    reducer: { distnet: distnetSlice.default },
    preloadedState: { settings: { sources: [], resourceTypes: [], credentials: []} },
  });

  const getWrapper = () =>
    mount(
      <Provider store={store}>
        <Router>
          <Counter />
        </Router>
      </Provider>
    );
  const component = getWrapper();

  return { store, component };
}

const gedcomxRes = { matcher: 'gedcomx', executablePath: 'exec-the-gedcomx' }
const htmlRes = { matcher: 'html', executablePath: 'exec-the-html' }
const jsonRes = { matcher: 'json', executablePath: 'exec-the-json' }
const taskyamlRes = { matcher: 'taskyaml', executablePath: 'exec-the-yaml' }

describe('Resource Types', () => {
  it('base cases should result in empty arrays', () => {
    expect(distnetSlice.resourceTypesForUris([], [])).toEqual([]);
    expect(distnetSlice.resourceTypesForUris([], [htmlRes, taskyamlRes])).toEqual([]);
    expect(distnetSlice.resourceTypesForUris(['file:///stuff.html'], [])).toEqual([]);
  });

  it('matches should work', () => {

    expect(distnetSlice.resourceTypesForUris(
      ['file:///stuff.html'],
      [taskyamlRes]))
    .toEqual([]);
    expect(distnetSlice.resourceTypesForUris(
      ['file:///stuff.html'],
      [gedcomxRes, htmlRes, taskyamlRes]
    )).toEqual([htmlRes]);

    // now all the resources

    expect(distnetSlice.resourceTypesForUris(
      ['gedcomx:distrinet/stuff.zip'],
      [gedcomxRes, htmlRes, jsonRes, taskyamlRes]
    )).toEqual([gedcomxRes]);

    expect(distnetSlice.resourceTypesForUris(
      ['gedcomx:distrinet/stuff.json'],
      [gedcomxRes, htmlRes, jsonRes, taskyamlRes]
    )).toEqual([gedcomxRes, jsonRes]);

    expect(distnetSlice.resourceTypesForUris(
      ['gedcomx:distrinet/stuff.gedx', 'file:///Users/myself/tree/father.zip'],
      [gedcomxRes, htmlRes, jsonRes, taskyamlRes]
    )).toEqual([gedcomxRes]);

    expect(distnetSlice.resourceTypesForUris(
      ['gedcomx:distrinet/stuff.gedx', 'file:///Users/myself/tree/mother.html'],
      [gedcomxRes, htmlRes, jsonRes, taskyamlRes]
    )).toEqual([gedcomxRes, htmlRes]);

    expect(distnetSlice.resourceTypesForUris(
      ['gedcomx:distrinet/stuff.json', 'file:///Users/myself/tree/mother.html'],
      [gedcomxRes, htmlRes, jsonRes, taskyamlRes]
    )).toEqual([gedcomxRes, htmlRes, jsonRes]);

    // now all the resources reversed

    expect(distnetSlice.resourceTypesForUris(
      ['gedcomx:distrinet/stuff.json'],
      [taskyamlRes, jsonRes, htmlRes, gedcomxRes]
    )).toEqual([jsonRes, gedcomxRes]);

    expect(distnetSlice.resourceTypesForUris(
      ['gedcomx:distrinet/stuff.json', 'file:///Users/myself/tree/mother.html'],
      [taskyamlRes, jsonRes, htmlRes, gedcomxRes]
    )).toEqual([jsonRes, htmlRes, gedcomxRes]);
  });
});
