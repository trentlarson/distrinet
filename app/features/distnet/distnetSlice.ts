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
  SettingsForStorage,
  SettingsInternal,
  SourceForStorage,
  SourceInternal,
} from './distnetClasses';
import {
  loadSettingsFromFile,
  readIriFromWellKnownDir,
  saveIriToWellKnownDir,
  saveSettingsToFile,
} from './settings';
import uriTools from './uriTools';

interface SettingsEditor {
  // should clone the settings and return a new one
  (settings: SettingsInternal): SettingsInternal;
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
    setSettingsStateObject: (state, contents: Payload<SettingsInternal>) => {
      state.settings = contents.payload;
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      state.settingsErrorMessage = checkSettingsInternal(contents.payload);
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

function isSettingsForStorage(
  // eslint-disable-next-line @typescript-eslint/ban-types
  contents: string | object | undefined
): contents is SettingsForStorage {
  return (
    typeof contents !== 'undefined' &&
    typeof contents !== 'string' &&
    (contents as SettingsForStorage).sources !== undefined
  );
}

function isSettingsInternal(
  // eslint-disable-next-line @typescript-eslint/ban-types
  contents: string | object | undefined
): contents is SettingsInternal {
  return (
    typeof contents !== 'undefined' &&
    typeof contents !== 'string' &&
    (contents as SettingsInternal).sources !== undefined
  );
}

/**
 * Take a settings object and do some validity checking
 * return error message or null (if no errors)
 */
function checkSettingsInternal(loaded: SettingsInternal): string | null {
  // do some basic sanity checks
  if (isSettingsInternal(loaded) && loaded.sources) {
    const errorsOrNulls = loaded.sources.map(
      (s: SourceInternal, index: number) => {
        if (!s.urls || s.urls.length === 0) {
          return `Source #${index + 1} has no URL.`;
        }
        return null;
      }
    );
    const errors = R.reject(R.isNil, errorsOrNulls);
    if (errors.length > 0) {
      return errors[0];
    }
    const sourceIds: Array<string> = loaded.sources.map((s) => s.id || '');
    const dupIds = R.omit([''], R.groupBy(R.identity, sourceIds));
    const dupsLists = R.filter((sa) => sa.length > 1, R.values(dupIds));
    if (dupsLists.length > 0) {
      const ids = R.map((dups) => dups[0], dupsLists);
      return `These sources have duplicate URI IDs: ${JSON.stringify(ids)}`;
    }
  } else {
    return 'That settings object does not have all settings elements, ie. sources';
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

export const dispatchReloadCacheForFile = (
  sourceId: string
): AppThunk => async (dispatch, getState): Promise<void> => {
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

const convertSourceToInternalFromStorage = async (
  storSource: SourceForStorage
): Promise<SourceInternal> => {
  let id = await readIriFromWellKnownDir(storSource.urls[0].url);
  if (!id) {
    // we'll generate something internally to ensure we have one
    id = storSource.urls[0].url;
  }
  const sourceInt: SourceInternal = { ...storSource, id };
  return sourceInt;
};

const convertSettingsToInternalFromStorage = async (
  settingsFile: SettingsForStorage
): Promise<SettingsInternal> => {
  const settingsInt: SettingsInternal = {
    ...settingsFile,
    sources: [],
  };
  let promises: Array<Promise<SourceInternal>> = [];
  for (let i = 0; i < settingsFile.sources.length; i += 1) {
    promises = R.append(
      convertSourceToInternalFromStorage(settingsFile.sources[i]),
      promises
    );
  }
  const newSources = await Promise.all(promises);
  settingsInt.sources = newSources;
  return settingsInt;
};

const convertSourceToStorageFromInternal = (
  source: SourceInternal
): SourceForStorage => {
  return R.omit('id', source);
};

const convertSettingsToStorageFromInternal = (
  settings: SettingsInternal
): SettingsForStorage => {
  const settingsStor: SettingsForStorage = R.clone(settings);
  for (let i = 0; i < settingsStor.sources.length; i += 1) {
    settingsStor.sources[i] = convertSourceToStorageFromInternal(
      settings.sources[i]
    );
  }
  return settingsStor;
};

export const dispatchSetSettingsTextAndYaml = (
  contents: string,
  changedFromFile: boolean
): AppThunk => async (dispatch) => {
  dispatch(dispatchSetSettingsText(contents, changedFromFile));
  let loadedSettings;
  try {
    loadedSettings = yaml.safeLoad(contents);
    if (isSettingsForStorage(loadedSettings)) {
      const internalSettings = await convertSettingsToInternalFromStorage(
        loadedSettings
      );
      dispatch(setSettingsStateObject(internalSettings));
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

const addSourceInternalToSettings = async (
  newSource: SourceInternal
): Promise<SettingsEditor> => {
  return (settings: SettingsInternal): SettingsInternal => {
    const newSettings: SettingsInternal = R.clone(settings);
    newSettings.sources = R.append(newSource, newSettings.sources);
    return newSettings;
  };
};

/** may no longer be needed
const addSourceForStorageToSettings = async (
  newSource: SourceForStorage
): Promise<SettingsEditor> => {
  const newSourceInt: SourceInternal = await convertSourceToInternalFromStorage(
    newSource
  );
  return addSourceInternalToSettings(newSourceInt);
};
 */

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
export const generateKeyAndSet = (settings: SettingsInternal) => {
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
  const settingsForStorage = convertSettingsToStorageFromInternal(newSettings);
  const settingsYaml: string = yaml.safeDump(settingsForStorage);
  dispatch(dispatchSetSettingsTextAndYaml(settingsYaml, true));
};

export const addDistrinetTaskSource: SettingsEditor = (
  settings: SettingsInternal
): SettingsInternal => {
  const newSettings = _.cloneDeep(settings);
  const baseTasksPath = path.join(
    electron.remote.app.getAppPath(),
    '..',
    'tasks.yml'
  );
  const newSource: SourceInternal = {
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
  const testSettings: SettingsForStorage = {
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
    { name: 'Sample Genealogy', urls: [ { url: genealogyPath } ] },
    { name: 'Sample Histories', urls: [ { url: historiesPath } ] },
    { name: 'Sample Business Project', urls: [ { url: businessTasksUrl } ] },
    { name: 'Sample Camping Project', urls: [ { url: campingTasksUrl } ] },
    { name: 'Sample Workweek Project', urls: [ { url: workweekTasksUrl } ] },
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
 param newSource must have unique ID & location
 param sourceIdIsOptional means that newSource.id is only a recommendation and should only be used if there is no IRI
 */
const dispatchAddToSettings = (
  newSource: SourceInternal,
  sourceIdIsOptional: boolean
): AppThunk => async (dispatch, getState) => {
  const urlAlreadyInSource: SourceInternal | undefined = R.find(
    (s) =>
      R.contains(
        newSource.urls[0].url,
        s.urls.map((u) => u.url)
      ),
    getState().distnet.settings.sources
  );
  const sourceIdAlreadyInSource: SourceInternal | undefined = R.find(
    (s) => s.id === newSource.id,
    getState().distnet.settings.sources
  );
  let iri = await readIriFromWellKnownDir(newSource.urls[0].url);
  const iriAlreadyInSource: SourceInternal | undefined = R.find(
    (s) => s.id === iri,
    getState().distnet.settings.sources
  );
  if (urlAlreadyInSource) {
    alert(
      `That path ${newSource.urls[0].url} already exists in source: ${urlAlreadyInSource.id}`
    );
  } else if (sourceIdAlreadyInSource) {
    alert(`That source ID of ${iri} already exists.`);
  } else if (iriAlreadyInSource) {
    alert(`That IRI of ${iri} already exists.`);
  } else if (!!iri && iri !== newSource.id && !sourceIdIsOptional) {
    alert(
      `The IRI on the file system of ${iri} doesn't match the supplied IRI of: ${newSource.id}`
    );
  } else {
    if (!iri) {
      saveIriToWellKnownDir(newSource.urls[0].url, newSource.id).catch(
        (err) => {
          console.log(
            `Got a problem saving the ID ${newSource.id} to the file: ${newSource.urls[0].url}`,
            err
          );
          alert(
            `Got a problem saving the ID ${newSource.id} to the file: ${newSource.urls[0].url} ... so you may have to fix your settings.` // eslint-disable-line max-len
          );
        }
      );
      iri = newSource.id;
    }

    // at this point, the IRI should be set to the right thing
    if (sourceIdIsOptional) {
      newSource.id = iri;
    } else if (newSource.id !== iri) {
      console.log(
        `Got a problem correlating ID ${newSource.id} to the IRI ${iri} ... so you may have to fix your settings. This shouldn't happen because the logic above should have set things correctly, but I guess it's good I added this warning.` // eslint-disable-line max-len
      );
      alert(
        `Got a problem correlating ID ${newSource.id} to the IRI ${iri} ... so you may have to fix your settings.`
      );
    }

    await dispatch(
      dispatchModifySettings(await addSourceInternalToSettings(newSource))
    );
    await dispatch(dispatchSaveSettingsTextToFileAndResetInternally());
    // If we don't await on reload-cache then drag-drop addition to task-lists will fail to 'show' if you click it.
    await dispatch(dispatchReloadCacheForFile(iri));
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
  await dispatch(dispatchAddToSettings(newSource, true));
};

export const dispatchAddGenealogyToSettings = (newSource: SourceInternal) =>
  dispatchAddToSettings(newSource, false);

export const dispatchAddHistoryToSettings = (filePath: string) =>
  dispatchBuildSourceAndAddToSettings('histories', filePath);

export const dispatchAddTaskListToSettings = (filePath: string) =>
  dispatchBuildSourceAndAddToSettings('taskyaml', filePath);

export default distnetSlice.reducer;
