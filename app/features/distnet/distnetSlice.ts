import bs58 from 'bs58';
import nodeCrypto, { KeyObject } from 'crypto';
import electron from 'electron';
import yaml from 'js-yaml';
import _ from 'lodash';
import path from 'path';
import * as R from 'ramda';
import { Dispatch } from 'react';
import { ActionCreatorWithoutPayload, createSlice } from '@reduxjs/toolkit';

// imports in this app
// eslint-disable-next-line import/no-cycle
import { AppThunk } from '../../store';
import {
  createCacheDir,
  reloadAllSourcesIntoCache,
  reloadOneSourceIntoCache,
} from './cache';
import {
  CacheData,
  CredentialType,
  DistnetState,
  Payload,
  ResourceType,
  Settings,
  Source,
} from './distnetClasses';
import {
  loadSettingsFromFile,
  saveSettingsToFile,
  saveIriToWellKnownDir
} from './settings';
import uriTools from './uriTools';

interface SettingsEditor {
  // should clone the settings and return a new one
  (settings: Settings): Settings;
}

const distnetSlice = createSlice({
  name: 'distnet',
  initialState: {
    settings: { sources: [], resourceTypes: [], credentials: [] },
    settingsChanged: false,
    settingsErrorMessage: null,
    settingsText: null,
    settingsSaveErrorMessage: null,
    cache: {},
    cacheErrorMessage: null,
  } as DistnetState,
  reducers: {
    setSettingsChanged: (state, contents: Payload<boolean>) => {
      state.settingsChanged = contents.payload;
    },
    setSettingsStateText: (state, contents: Payload<string>) => {
      state.settingsText = contents.payload;
    },
    setSettingsStateObject: (state, contents: Payload<Settings>) => {
      state.settings = contents.payload;
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      state.settingsErrorMessage = checkSettings(contents.payload);
    },
    setSettingsErrorMessage: (state, contents: Payload<string | null>) => {
      state.settingsErrorMessage = contents.payload;
    },
    setSettingsSaveErrorMessage: (state, contents: Payload<string | null>) => {
      state.settingsSaveErrorMessage = contents.payload;
    },
    setCachedStateForAll: (state, result: Payload<Array<CacheData>>) => {
      const newData: Array<CacheData> = result.payload;
      // console.log('Refreshing cache from', newData);
      for (let i = 0; i < newData.length; i += 1) {
        state.cache[newData[i].sourceId] = newData[i];
      }
      // console.log('Finished refreshing memory cache results for: ', newData);
    },
    setCachedStateForOne: (state, result: Payload<CacheData>) => {
      state.cache[result.payload.sourceId] = result.payload;
    },
    setCacheErrorMessage: (state, result: Payload<string>) => {
      state.cacheErrorMessage = result.payload;
    },
  },
});

const {
  setCachedStateForAll,
  setCachedStateForOne,
  setCacheErrorMessage,
  setSettingsChanged,
  setSettingsErrorMessage,
  setSettingsSaveErrorMessage,
  setSettingsStateObject,
  setSettingsStateText,
} = distnetSlice.actions;

function isSettings(
  // eslint-disable-next-line @typescript-eslint/ban-types
  contents: string | object | undefined
): contents is Settings {
  return (
    typeof contents !== 'undefined' &&
    typeof contents !== 'string' &&
    (contents as Settings).sources !== undefined
  );
}

/**
 * Take a settings object and do some validity checking
 * return error message or null (if no errors)
 */
function checkSettings(loaded: Settings): string | null {
  // do some basic sanity checks
  if (isSettings(loaded) && loaded.sources) {
    const errorsOrNulls = loaded.sources.map((s: Source, index: number) => {
      if (!s || !s.id) {
        return `Source #${index} or its ID is null or undefined.`;
      }
      if (!s.urls || s.urls.length === 0) {
        return `Source #${index + 1} has no URL.`;
      }
      return null;
    });
    const errors = R.reject(R.isNil, errorsOrNulls);
    if (errors.length > 0) {
      return errors[0];
    }
    const sourcesById = R.groupBy(R.prop('id'), loaded.sources);
    const dupsLists = R.filter((sa) => sa.length > 1, R.values(sourcesById));
    if (dupsLists.length > 0) {
      const ids = R.map((dups) => dups[0].id, dupsLists);
      return `These sources have duplicate URI IDs: ${JSON.stringify(ids)}`;
    }
  } else {
    return 'That settings object does not have all settings elements, ie sources';
  }
  return null;
}

let resetStateMethods: Array<ActionCreatorWithoutPayload<string>> = [];

const callResetStateMethods = (): AppThunk => async (dispatch) => {
  for (let i = 0; i < resetStateMethods.length; i += 1) {
    dispatch(resetStateMethods[i]());
  }
};

interface ResourceTypeAndPosition {
  fullType: ResourceType;
  pos: number;
}

/**
 * @return all the resourceType info for the given URIs, in order of preference
 */
export const resourceTypesForUris = (
  uris: Array<string>,
  resourceTypes: Array<ResourceType>
): Array<ResourceType> => {
  // fill this array with arrays of { fullType: ResourceType, pos: number position in resourceTypes }
  let resourceTypesAndPositions: Array<ResourceTypeAndPosition> = [];
  for (let i = 0; resourceTypes && i < uris.length; i += 1) {
    const scheme = uris[i].substring(0, uris[i].indexOf(':')).toLowerCase();
    const resourceTypeIndex = R.findIndex(
      (t) => t.matcher.toLowerCase() === scheme,
      resourceTypes
    );
    if (resourceTypeIndex > -1) {
      resourceTypesAndPositions = R.append(
        { fullType: resourceTypes[resourceTypeIndex], pos: resourceTypeIndex },
        resourceTypesAndPositions
      );
    }

    const extension = uris[i]
      .substring(uris[i].lastIndexOf('.') + 1)
      .toLowerCase();
    const extensionTypeIndex = R.findIndex(
      (t) => t.matcher.toLowerCase() === extension,
      resourceTypes
    );
    if (extensionTypeIndex > -1) {
      resourceTypesAndPositions = R.append(
        {
          fullType: resourceTypes[extensionTypeIndex],
          pos: extensionTypeIndex,
        },
        resourceTypesAndPositions
      );
    }
  }
  const inOrder = R.sortBy(R.prop('pos'), resourceTypesAndPositions);
  return R.map(R.prop('fullType'), inOrder);
};

export const dispatchReloadCacheForId = (sourceId: string): AppThunk => async (
  dispatch,
  getState
): Promise<void> => {
  await createCacheDir().catch((error) => {
    dispatch(setCacheErrorMessage(error.toString()));
  });
  const result: CacheData | null = await reloadOneSourceIntoCache(
    sourceId,
    getState().distnet.settings
  );
  if (result) {
    dispatch(setCachedStateForOne(result));
    return;
  }
  console.error(
    `Failed to load source ${sourceId} into cache because it was not found in sources.`
  );
};

function removeNulls<T>(array: Array<T | null>): Array<T> {
  // Lodash _.filter failed me with a Typescript error, and so did Ramda R.filter & R.reject.
  const result: Array<T> = [];
  for (let i = 0; i < array.length; i += 1) {
    const value = array[i];
    if (value !== null) {
      result.push(value);
    }
  }
  return result;
}

export const dispatchCacheForAll = (): AppThunk => async (
  dispatch,
  getState
) => {
  await createCacheDir().catch((error) => {
    dispatch(setCacheErrorMessage(error.toString()));
  });
  const allCaches: Array<CacheData | null> = await reloadAllSourcesIntoCache(
    getState().distnet.settings
  );
  const result: Array<CacheData> = removeNulls(allCaches);
  return dispatch(setCachedStateForAll(result));
};

export const dispatchSetSettingsText = (
  contents: string,
  changedFromFile: boolean
): AppThunk => (dispatch) => {
  dispatch(setSettingsStateText(contents));
  dispatch(setSettingsChanged(changedFromFile));
};

export const dispatchSetSettingsTextAndYaml = (
  contents: string,
  changedFromFile: boolean
): AppThunk => (dispatch) => {
  dispatch(dispatchSetSettingsText(contents, changedFromFile));
  let loadedSettings;
  try {
    loadedSettings = yaml.safeLoad(contents);
    if (isSettings(loadedSettings)) {
      dispatch(setSettingsStateObject(loadedSettings));
      dispatch(dispatchCacheForAll());
      dispatch(callResetStateMethods());
    } else {
      throw Error('Settings file does not match Settings format.');
    }
  } catch (error) {
    // probably a YAMLException https://github.com/nodeca/js-yaml/blob/master/lib/js-yaml/exception.js
    console.error(
      'Inside TextAndYaml, got error:',
      error,
      ' ... trying to parse and set from contents:',
      loadedSettings
    );
    dispatch(setSettingsErrorMessage(error.message));
  }
};

// let's transform these results into explicit Left|Right convention
function isError(
  value: string | { error: string }
): value is { error: string } {
  return (value as { error: string }).error !== undefined;
}

export const dispatchLoadSettingsFromFile = (): AppThunk => async (
  dispatch
) => {
  const result = await loadSettingsFromFile();
  if (isError(result)) {
    dispatch(setSettingsErrorMessage(result.error));
  } else {
    dispatch(dispatchSetSettingsTextAndYaml(result, false));
  }
};

export const dispatchLoadSettingsFromFileIfEmpty = (): AppThunk => async (
  dispatch,
  getState
) => {
  if (!getState().distnet.settingsText) {
    dispatch(dispatchLoadSettingsFromFile());
  }
};

export const dispatchLoadSettingsAndCacheIfEmpty = (
  methodsThatResetState: Array<ActionCreatorWithoutPayload<string>>
): AppThunk => async (dispatch) => {
  await dispatch(dispatchLoadSettingsFromFileIfEmpty());
  resetStateMethods = methodsThatResetState;
};

export const dispatchSaveSettingsTextToFileAndResetInternally = (): AppThunk => async (
  dispatch,
  getState
) => {
  const { settingsText } = getState().distnet;
  if (R.isNil(settingsText)) {
    dispatch(
      setSettingsSaveErrorMessage(
        "Sorry, but I won't save an empty config file."
      )
    );
  } else if (settingsText === '') {
    dispatch(
      setSettingsSaveErrorMessage(
        "Sorry, but I won't save an empty config file."
      )
    );
  } else {
    // settingsText is a non-empty string
    const result = await saveSettingsToFile(settingsText);
    if (result && result.error) {
      dispatch(setSettingsSaveErrorMessage(result.error));
    } else {
      dispatch(dispatchSetSettingsTextAndYaml(settingsText, false));
      dispatch(setSettingsSaveErrorMessage(null));
    }
  }
};

const addSourceToSettings = (newSource: Source) => (settings: Settings) => {
  const newSettings = R.clone(settings);
  newSettings.sources = R.append(newSource, newSettings.sources);
  return newSettings;
};

/**

Everything about DIDs is complicated!  I don't know if I've done it right.

Another option: use "key" DIDs.  (... which I could pull apart to make a "peer".)

I'd like to user the [Peer DIDs](https://identity.foundation/peer-did-method-spec/index.html),
but I can't figure out how to get the byte array from the KeyObject for the public key in the
core crypto.js library.  Weird, huh?

So I tried to use [crypt-ld](https://github.com/digitalbazaar/crypto-ld) with
cryptoLD.generate({type: 'Ed25519VerificationKey2018'}) but it failed with the following:
Uncaught (in promise) TypeError: semver__WEBPACK_IMPORTED_MODULE_3__.gte is not a function
    at Function.generate (Ed25519VerificationKey2018.js:95)
    at CryptoLD.generate (CryptoLD.js:45)

 */

/**
 * @param publicKey: KeyObject
 *
 * This may be wrong: it uses the DER bytes as SHA256 import.
 * I don't think the DER format accurately gives the underlying bytes that make
 * up the public key, but I can't find any other way to get the byte array!
 *
 * https://identity.foundation/peer-did-method-spec/index.html#method-specific-identifier
 */
function peerDidFromPublicKey(publicKey: KeyObject) {
  const multicodecBuf: Buffer = Buffer.from([0x12, 0x20]);

  const basisBuf: Buffer = publicKey.export({
    type: 'spki',
    format: 'der',
  });
  const numAlgoBuf: Buffer = nodeCrypto
    .createHash('sha256')
    .update(basisBuf)
    .digest();
  const encnumbasisBuf: Buffer = Buffer.concat([multicodecBuf, numAlgoBuf]);
  const encnumbasis: string = bs58.encode(encnumbasisBuf);

  const peerDid = `did:peer:0z${encnumbasis}`;
  return peerDid;
}

/**
 Note that we've got this as a function
 */
export const generateKeyAndSet = (settings: Settings) => {
  const newSettings = _.cloneDeep(settings);
  const { publicKey, privateKey } = nodeCrypto.generateKeyPairSync('ec', {
    namedCurve: 'secp224r1',
  });
  const did = peerDidFromPublicKey(publicKey);
  const keyPkcs8Pem = privateKey.export({ type: 'pkcs8', format: 'pem' });

  if (_.isNil(newSettings.credentials)) {
    newSettings.credentials = [];
  }
  const creds = newSettings.credentials;
  let privCred = _.find(creds, (c) => c.id === 'privateKey');
  if (_.isNil(privCred)) {
    privCred = { id: 'privateKey', type: CredentialType.PRIVATE_KEY };
  }
  privCred.did = did;
  privCred.privateKeyPkcs8Pem = keyPkcs8Pem.toString();

  newSettings.credentials = _.unionWith(
    [privCred],
    creds,
    (c1, c2) => c1.id === c2.id
  );
  return newSettings;
};

export const dispatchModifySettings = (
  settingsEditor: SettingsEditor
): AppThunk => async (dispatch, getState) => {
  const newSettings = settingsEditor(getState().distnet.settings);
  const settingsYaml: string = yaml.safeDump(newSettings);
  dispatch(dispatchSetSettingsTextAndYaml(settingsYaml, true));
};

export const addDistrinetTaskSource = (settings: Settings) => {
  const newSettings = _.cloneDeep(settings);
  const baseTasksPath = path.join(
    electron.remote.app.getAppPath(),
    '..',
    'tasks.yml'
  );
  const newSource: Source = {
    id: 'taskyaml:trentlarson.com,2020:distrinet/tasks',
    name: 'Distrinet Project',
    urls: [
      { url: `file://${baseTasksPath}` },
      {
        url:
          'https://raw.githubusercontent.com/trentlarson/distrinet/master/tasks.yml',
      },
    ],
  };
  newSettings.sources = _.unionWith(
    [newSource],
    newSettings.sources,
    (c1, c2) => c1.id === c2.id
  );
  return newSettings;
};

export const testSettingsYamlText = (appPath: string): string => {
  const testSettings: Settings = {
    sources: [],
    resourceTypes: [],
    credentials: [],
  };

  /* eslint-disable prettier/prettier */
  /* eslint-disable prefer-template */

  const basePath = path.join(appPath, '..', 'test', 'features');
  const genealogyPath = 'file://' + path.join(basePath, 'genealogy', 'sample-gedcomx-norman.json');
  const historiesPath = 'file://' + path.join(basePath, 'histories', 'sample-histories');
  const businessTasksUrl = 'file://' + path.join(basePath, 'task-lists', 'sample-business.yml');
  const campingTasksUrl = 'file://' + path.join(basePath, 'task-lists', 'sample-camping.yml');
  const workweekTasksUrl = 'file://' + path.join(basePath, 'task-lists', 'sample-workweek.yml');

  /* eslint-enable prefer-template */

  testSettings.sources = [
    { name: 'Sample Genealogy', id: 'gedcomx:my-local-test:test-sample-norman', urls: [ { url: genealogyPath } ] },
    { name: 'Sample Histories', id: 'histories:local-test-files:test-sample', urls: [ { url: historiesPath } ] },
    { name: 'Sample Business Project', id: 'taskyaml:local-business-test-project', urls: [ { url: businessTasksUrl } ] }, // eslint-disable-line max-len
    { name: 'Sample Camping Project', id: 'taskyaml:local-camping-test-project', urls: [ { url: campingTasksUrl } ] },
    { name: 'Sample Workweek Project', id: 'taskyaml:local-workweek-test-project', urls: [ { url: workweekTasksUrl } ] }, // eslint-disable-line max-len
  ];

  /* eslint-enable prettier/prettier */

  const newYaml = yaml.safeDump(testSettings);
  return newYaml;
};

// //////////////////////////////////////////////////////////////
// Drag & Drop a repo

// I usually see the drag-drop code fire twice (and I've even see it dozens of time with one drag).
// So these are to guard against those possibilities.
let timestampOfLastDrop = 0;
let lastFile = '';

/**
 param callbackToDispatch takes a file path string, then a (dispatch, getState), meant for 'dispatch'
 */
export const addDragDropListeners = (
  elem: HTMLElement,
  // The type of this should probably be (string)=>AppThunk because that matches code in histories & task-lists
  // however it does not match the setRootUri in the genealogy.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callbackToDispatch: (filePath: string) => any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: Dispatch<any>
) => {
  // from https://www.geeksforgeeks.org/drag-and-drop-files-in-electronjs/

  elem.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.dataTransfer || event.dataTransfer.files.length !== 1) {
      // Technically there's no problem adding more, but we should add more confirmations if they do this
      // because the typical case is to only have one ID per repo. I worry about people dragging files by mistake.
      alert('We only support adding one folder at a time.');
    } else {
      const filePath = event.dataTransfer.files[0].path;
      if (
        filePath === lastFile &&
        new Date().getTime() - timestampOfLastDrop < 5000
      ) {
        console.log('Got a duplicate event: ', event, '... so ignoring it.');
      } else {
        timestampOfLastDrop = new Date().getTime();
        lastFile = filePath;
        dispatch(callbackToDispatch(filePath));
      }
    }
  });

  elem.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // There are also 'dragenter' and 'dragleave' events which may help to trigger visual indications.
};

/**
 param newSource must have unique location
 param iri (optional) must be unique, will be written to a file in the repo
 */
const dispatchAddToSettings = (newSource: Source, iri: string): AppThunk => async (
  dispatch,
  getState
) => {
  const urlAlreadyInSource: Source | undefined = R.find(
    (s) =>
      R.contains(
        newSource.urls[0].url,
        s.urls.map((u) => u.url)
      ),
    getState().distnet.settings.sources
  );
  const iriAlreadyInSource: Source | undefined = R.find(
    (s) => s.id === iri,
    getState().distnet.settings.sources
  );
  if (urlAlreadyInSource) {
    alert(`That path already exists in source ${urlAlreadyInSource.id}`);
  } else if (iriAlreadyInSource) {
    alert(`That path already exists in source ${urlAlreadyInSource.id}`);
  } else {
    await dispatch(dispatchModifySettings(addSourceToSettings(newSource)));
    await dispatch(dispatchSaveSettingsTextToFileAndResetInternally());
    await dispatch(dispatchReloadCacheForId(newSource.id)); // if we don't await here then drag-drop addition to task-lists will fail to 'show' if you click it
    saveIriToWellKnownDir(newSource.urls[0].url, iri);
    // eslint-disable-next-line no-new
    new Notification('Added', {
      body: `Added that source.`,
      silent: true,
    });
  }
};

const dispatchBuildSourceAndAddToSettings = (
  prefix: string,
  filePath: string
): AppThunk => async (dispatch) => {
  const fileUrl = `file://${filePath}`;
  const newPath = uriTools.bestGuessAtGoodUriPath(filePath);
  const newId = `${prefix}:${newPath}`;
  const newSource = {
    id: newId,
    urls: [{ url: fileUrl }],
  };
  await dispatch(dispatchAddToSettings(newSource, newSource.id));
};

export const dispatchAddGenealogyToSettings = (newSource: Source) =>
  dispatchAddToSettings(newSource, newSource.id);

export const dispatchAddHistoryToSettings = (filePath: string) =>
  dispatchBuildSourceAndAddToSettings('histories', filePath);

export const dispatchAddTaskListToSettings = (filePath: string) =>
  dispatchBuildSourceAndAddToSettings('taskyaml', filePath);

export default distnetSlice.reducer;
