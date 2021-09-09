
/**

 See ../counter/Counter.spec.tsx for even more functionality.

 */

/* eslint react/jsx-props-no-spreading: off, @typescript-eslint/ban-ts-comment: off */
import React from 'react';
import Enzyme, { mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { BrowserRouter as Router } from 'react-router-dom';
import renderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Distnet from '../../../app/features/distnet/Distnet';
import * as distnetSlice from '../../../app/features/distnet/distnetSlice';

Enzyme.configure({ adapter: new Adapter() });
jest.useFakeTimers();

function setup(
  preloadedState: { distnet: { settings: { sources: Array<Source> } } } = { distnet: { settings: { sources: [] } } }
) {
  const store = configureStore({
    reducer: { distnet: distnetSlice.default },
    preloadedState,
  });

  const getWrapper = () =>
    mount(
      <Provider store={store}>
        <Router>
          <Distnet appPath='./test-here'/>
        </Router>
      </Provider>
    );
  const component = getWrapper();
  return {
    store,
    component,
    settingsInput: component.find('textarea'),
    generateKeyButton: component.find('.generateKeyButton').at(0),
    testYamlButton: component.find('.testYamlButton'),
  };
}

describe('settings text', () => {
  it('settings should be empty at start', () => {
    const { settingsInput } = setup();
    expect(settingsInput.text()).toMatch(/^$/);
  });
});

describe('settings async actions', () => {

  it('test settings should fill basic info', () => {
    const { settingsInput, generateKeyButton } = setup();

    /**
    // This complains that fn.dispatch isn't a function.
    const fn = distnetSlice.testSettingsYaml;
    expect(fn).toBeInstanceOf(Function);
    const dispatch = jest.fn();
    fn.dispatch();
    */

    const keySpy = jest.spyOn(distnetSlice, 'generateKeyAndSet');
    
    generateKeyButton.simulate('click');
    expect(keySpy).toBeCalled();
    expect(settingsInput.text()).toMatch(/^sources:/);
    keySpy.mockRestore();
  });

});
