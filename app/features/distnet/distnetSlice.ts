import bs58 from 'bs58';
import nodeCrypto, { KeyObject } from 'crypto';
import electron from 'electron';
import fs from 'fs';
import fsExtra from 'fs-extra';
import yaml from 'js-yaml';
import _ from 'lodash';
import { DateTime } from 'luxon';
import path from 'path';
import * as R from 'ramda';
import url from 'url';
import { Dispatch } from 'react';
import { ActionCreatorWithoutPayload, createSlice } from '@reduxjs/toolkit';

// imports in this app
// eslint-disable-next-line import/no-cycle
import { AppThunk } from '../../store';
import {
  createCacheDir,
  reloadAllSourcesIntoCache,
  reloadOneSourceIntoCache,
  removeNulls,
} from './cache';
import {
  CacheData,
  CredentialType,
  DistnetState,
  keepHistoryWhileCopying,
  Payload,
  ResourceType,
  SettingsForStorage,
  SettingsInternal,
  SourceForStorage,
  SourceInternal,
} from './distnetClasses';
import {
  historyDestFullPathFromPath,
  retrieveFileMtime,
  retrieveHistoryReviewedDate,
} from './history';
import {
  ErrorResult,
  isErrorResult,
  loadSettingsFromFile,
  readIriFromWellKnownDir,
  saveIriToWellKnownDir,
  saveSettingsToFile,
} from './settings';
import uriTools from './uriTools';

interface SettingsEditor {
  // should clone the settings and return a new one (or null on error)
  (settings: SettingsInternal): SettingsInternal | null;
}

interface SourceAndReviewedDate {
  source: SourceInternal;
  dateReviewed: string;
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
    // settings

    // payload is the source ID on which changes were acked
    setChangesAcked: (state, contents: Payload<string>) => {
      const source = R.find(
        (s) => s.id === contents.payload,
        state.settings.sources
      );
      if (source) {
        source.changesAckedDate = new Date().toISOString();
        source.notifyChanged = false;
      } else {
        console.log(
          'Very strange: tried to set notifyChanged on unknown source',
          contents.payload
        );
      }
    },
    // payload is the source ID which has changes of which we need to notify the user
    setNotifySourceChanged: (state, contents: Payload<string>) => {
      const source = R.find(
        (s) => s.id === contents.payload,
        state.settings.sources
      );
      if (source) {
        source.notifyChanged = true;
      } else {
        console.log(
          'Very strange: tried to set notifyChanged on unknown source',
          contents.payload
        );
      }
    },
    setSettingsChanged: (state, contents: Payload<boolean>) => {
      state.settingsChanged = contents.payload;
    },
    // eslint-disable-next-line max-len,prettier/prettier
    setSettingsSourceReviewedDate: (state, contents: Payload<SourceAndReviewedDate>) => {
      const source = R.find(
        (s) => s.id === contents.payload.source.id,
        state.settings.sources
      );
      if (source) {
        source.dateReviewed = contents.payload.dateReviewed;
      }
    },
    setFileCacheEmpty: (state, contents: Payload<string>) => {
      state.settings.cache[contents.payload].fileCache = [];
    },
    setSettingsStateText: (state, contents: Payload<string>) => {
      state.settingsText = contents.payload;
    },
    setSettingsStateObject: (state, contents: Payload<SettingsInternal>) => {
      state.settings = contents.payload;
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      state.settingsErrorMessage = checkSettingsInternal(contents.payload);
    },

    // messages

    setSettingsErrorMessage: (state, contents: Payload<string | null>) => {
      state.settingsErrorMessage = contents.payload;
    },
    setSettingsSaveErrorMessage: (state, contents: Payload<string | null>) => {
      state.settingsSaveErrorMessage = contents.payload;
    },

    // cache

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
  setChangesAcked,
  setNotifySourceChanged,
  setSettingsChanged,
  setSettingsErrorMessage,
  setSettingsSaveErrorMessage,
  setSettingsSourceReviewedDate,
  setSettingsStateObject,
  setSettingsStateText,
} = distnetSlice.actions;

// similar to sourceMap in TaskListTable
export function getSourceForIri(iri: string, sources: Array<SourceInternal>) {
  return R.find((s) => s.id === iri, sources);
}

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
        if (!s.workUrl) {
          return `Source #${index + 1} has no working URL.`;
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
      return `These sources have duplicate IRI IDs: ${JSON.stringify(ids)}`;
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
  } else {
    console.error(
      `Failed to load source ${sourceId} into cache because it was not found in sources.`
    );
  }
};

export const dispatchReloadReviewed = (): AppThunk => async (
  dispatch,
  getState
) => {
  const unacked: Array<Promise<any>> = R.map(async (source) => {
    return retrieveFileMtime(url.fileURLToPath(source.workUrl)).then((date) => {
      if (
        date != null &&
        (!source.changesAckedDate ||
          DateTime.fromISO(date) > DateTime.fromISO(source.changesAckedDate))
      ) {
        return dispatch(setNotifySourceChanged(source.id));
      }
      return null;
    });
  }, getState().distnet.settings.sources);
  const reviewed: Array<Promise<any>> = R.map(async (source) => {
    return retrieveHistoryReviewedDate(source.workUrl).then((dateStr) => {
      if (dateStr != null) {
        return dispatch(
          setSettingsSourceReviewedDate({ source, dateReviewed: dateStr })
        );
      }
      return null;
    });
  }, getState().distnet.settings.sources);
  return R.concat(unacked, reviewed);
};

export const dispatchReloadCacheForAll = (): AppThunk => async (
  dispatch,
  getState
) => {
  await createCacheDir().catch((error) => {
    dispatch(setCacheErrorMessage(error.toString()));
  });
  const numSources = getState().distnet.settings?.sources?.length;
  console.log('Loading', numSources, 'source work URLs into memory cache...');
  const allCaches: Array<CacheData | null> = await reloadAllSourcesIntoCache(
    getState().distnet.settings
  );
  const result: Array<CacheData> = removeNulls(allCaches);
  dispatch(setCachedStateForAll(result));
  console.log('... succeeded loading', result.length, '/', numSources, 'work URLs into memory cache.'); // eslint-disable-line max-len,prettier/prettier
  dispatch(dispatchReloadReviewed());
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
  const { iri, iriFile } = await readIriFromWellKnownDir(storSource.workUrl);
  const finalIri = iri || storSource.workUrl;
  const mtime = await retrieveFileMtime(url.fileURLToPath(storSource.workUrl));
  const notifyChanged =
    !storSource.changesAckedDate ||
    DateTime.fromISO(mtime) > DateTime.fromISO(storSource.changesAckedDate);
  const dateReviewed = await retrieveHistoryReviewedDate(storSource.workUrl);
  const sourceInt: SourceInternal = {
    ...storSource,
    id: finalIri,
    idFile: iriFile,
    notifyChanged,
    dateReviewed,
  };
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
  return R.omit(['dateReviewed', 'id', 'idFile', 'notifyChanged'], source);
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

const dispatchSetSettingsYamlFromText = (contents: string): AppThunk => async (
  dispatch
) => {
  let loadedSettings;
  try {
    loadedSettings = yaml.safeLoad(contents);
    if (isSettingsForStorage(loadedSettings)) {
      const internalSettings = await convertSettingsToInternalFromStorage(
        loadedSettings
      );
      dispatch(setSettingsStateObject(internalSettings));
      dispatch(callResetStateMethods());
      dispatch(dispatchReloadCacheForAll());
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

/**
  Use contents arg to set all the settings state for text & objects, plus the cache.
 */
export const dispatchSetSettingsTextAndYaml = (
  contents: string,
  changedFromFile: boolean
): AppThunk => async (dispatch) => {
  dispatch(dispatchSetSettingsText(contents, changedFromFile));
  dispatch(dispatchSetSettingsYamlFromText(contents));
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

/**
  Use settings text to save in file and set internal object
 */
export const dispatchSaveSettingsTextToFileAndResetObject = (): AppThunk => async (
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

export const dispatchSetChangesAckedAndSave = (
  sourceId: string
): AppThunk => async (dispatch, getState) => {
  await dispatch(setChangesAcked(sourceId));

  const settingsForStorage = convertSettingsToStorageFromInternal(
    getState().distnet.settings
  );
  const settingsYaml: string = yaml.safeDump(settingsForStorage);
  dispatch(setSettingsStateText(settingsYaml));

  // settingsText is a non-empty string
  const result = await saveSettingsToFile(settingsYaml);
  if (result && result.error) {
    dispatch(setSettingsSaveErrorMessage(result.error));
  } else {
    dispatch(setSettingsSaveErrorMessage(null));
  }
};

const addSourceInternalToSettingsObject = (
  newSource: SourceInternal
): SettingsEditor => {
  return (settings: SettingsInternal): SettingsInternal => {
    const newSettings: SettingsInternal = R.clone(settings);
    newSettings.sources = R.append(newSource, newSettings.sources);
    return newSettings;
  };
};

/** may no longer be needed
const addSourceForStorageToSettingsObject = async (
  newSource: SourceForStorage
): Promise<SettingsEditor> => {
  const newSourceInt: SourceInternal = await convertSourceToInternalFromStorage(
    newSource
  );
  return addSourceInternalToSettingsObject(newSourceInt);
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

function sha1(input: Buffer) {
  return nodeCrypto.createHash('sha1').update(input).digest();
}

function passwordDeriveBytes(
  password: string,
  salt: string,
  iterations: number,
  len: number
) {
  let key = Buffer.from(password + salt);
  for (let i = 0; i < iterations; i += 1) {
    key = sha1(key);
  }
  if (key.length < len) {
    const hx = passwordDeriveBytes(password, salt, iterations - 1, 20);
    for (let counter = 1; key.length < len; counter += 1) {
      key = Buffer.concat([
        key,
        sha1(Buffer.concat([Buffer.from(counter.toString()), hx])),
      ]);
    }
  }
  return Buffer.alloc(len, key);
}

function encrypt(
  plainText: string,
  password: string,
  salt: string,
  ivBase64: string
) {
  const ivBuf = Buffer.from(ivBase64, 'base64');
  const key = passwordDeriveBytes(password, salt, 100, 32);
  const cipher = nodeCrypto.createCipheriv('aes-256-cbc', key, Buffer.from(ivBuf)); // eslint-disable-line max-len,prettier/prettier
  const part1 = cipher.update(plainText, 'utf8');
  const part2 = cipher.final();
  const encrypted = Buffer.concat([part1, part2]).toString('base64');
  return encrypted;
}

export function decrypt(
  encrypted: string,
  password: string,
  salt: string,
  ivBase64: string
) {
  const ivBuf = Buffer.from(ivBase64, 'base64');
  const key = passwordDeriveBytes(password, salt, 100, 32);
  const decipher = nodeCrypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivBuf)); // eslint-disable-line max-len,prettier/prettier
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final();
  return decrypted;
}

/**
 Function to take settings and return new copy with private key credentials.
 @return null if there was an error
 */
export const generateKeyAndSet = (password: string) => (settings: SettingsInternal) => { // eslint-disable-line max-len,prettier/prettier
  try {
    const newSettings = _.cloneDeep(settings);

    // generate the key
    const { publicKey, privateKey } = nodeCrypto.generateKeyPairSync('ec', {
      namedCurve: 'secp224r1',
    });
    const did = peerDidFromPublicKey(publicKey);
    const keyPkcs8Pem = privateKey.export({ type: 'pkcs8', format: 'pem' });

    // now encrypt that key with the password
    // just random string (which gets added to the password)
    // ... which I realize isn't really a problem here since we're not
    // transmitting the password or storing it with others. But I may reuse code.
    const salt = nodeCrypto.randomBytes(6).toString('base64');
    // encoding of a specific number of bytes
    const ivBase64 = nodeCrypto.randomBytes(16).toString('base64');
    const keyEncrypted = encrypt(keyPkcs8Pem.toString(), password, salt, ivBase64); // eslint-disable-line max-len,prettier/prettier

    if (_.isNil(newSettings.credentials)) {
      newSettings.credentials = [];
    }
    const creds = newSettings.credentials;
    let privCred = _.find(creds, (c) => c.id === 'privateKey');
    if (_.isNil(privCred)) {
      privCred = { id: 'privateKey', type: CredentialType.PRIVATE_KEY };
    }
    privCred.did = did;
    privCred.encryptedPkcs8PemPrivateKey = keyEncrypted;
    privCred.ivBase64 = ivBase64;
    privCred.salt = salt;

    newSettings.credentials = _.unionWith(
      [privCred],
      creds,
      (c1, c2) => c1.id === c2.id
    );

    return newSettings;
  } catch (e) {
    console.log('Got an error while generating a key pair:', e);
    alert('Ack! There was an error. See the dev console log for more info.');
    return null;
  }
};

export const dispatchModifySettings = (
  settingsEditor: SettingsEditor
): AppThunk => async (dispatch, getState) => {
  const newSettings = settingsEditor(getState().distnet.settings);
  if (newSettings != null) {
    const settingsForStorage = convertSettingsToStorageFromInternal(newSettings); // eslint-disable-line max-len,prettier/prettier
    const settingsYaml: string = yaml.safeDump(settingsForStorage);
    dispatch(dispatchSetSettingsTextAndYaml(settingsYaml, true));
  } else {
    console.log(
      'Not saving settings because we got no change. You should see a previous error in the log.'
    );
  }
};

export const addDistrinetTaskSource: SettingsEditor = (
  settings: SettingsInternal
): SettingsInternal => {
  const newSettings = _.cloneDeep(settings);
  const baseTasksPath: string = path.join(
    electron.remote.app.getAppPath(),
    '..',
    'tasks.yml'
  );
  const iriPath: string = path.join(
    electron.remote.app.getAppPath(),
    '..',
    '.tasks.yml.iri'
  );
  const newSource: SourceInternal = {
    id: 'taskyaml:trentlarson.com,2020:distrinet/tasks',
    idFile: iriPath,
    name: 'Distrinet Project',
    workUrl: url.pathToFileURL(baseTasksPath).toString(),
    urls: [
      {
        url:
          'https://raw.githubusercontent.com/trentlarson/distrinet/master/tasks.yml',
      },
    ],
    changesAckedDate: new Date().toISOString(),
    notifyChanged: true,
    dateReviewed: null,
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
  const genealogyPath = url.pathToFileURL(path.join(basePath, 'genealogy', 'sample-gedcomx-norman.json')).toString();
  const historiesPath = url.pathToFileURL(path.join(basePath, 'histories', 'sample-histories')).toString();
  const businessTasksUrl = url.pathToFileURL(path.join(basePath, 'task-lists', 'sample-business.yml')).toString();
  const campingTasksUrl = url.pathToFileURL(path.join(basePath, 'task-lists', 'sample-camping.yml')).toString();
  const workweekTasksUrl = url.pathToFileURL(path.join(basePath, 'task-lists', 'sample-workweek.yml')).toString();
  const changesAckedDate = new Date().toISOString();

  /* eslint-enable prefer-template */

  testSettings.sources = [
    { name: 'Sample Genealogy', workUrl: genealogyPath, changesAckedDate },
    { name: 'Sample Histories', workUrl: historiesPath, changesAckedDate },
    { name: 'Sample Business Project', workUrl: businessTasksUrl, changesAckedDate },
    { name: 'Sample Camping Project', workUrl: campingTasksUrl, changesAckedDate },
    { name: 'Sample Workweek Project', workUrl: workweekTasksUrl, changesAckedDate },
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

const setupLocalIri = async (
  name: string,
  workUrl: string,
  suggestedId: string,
  sources: Array<SourceInternal>
): Promise<SourceInternal | ErrorResult> => {
  const urlAlreadyInSource: SourceInternal | undefined = R.find(
    (s) =>
      workUrl === s.workUrl ||
      R.contains(workUrl, (s.urls || []).map(R.prop('url'))),
    sources
  );
  if (urlAlreadyInSource) {
    return {
      error: `That path ${workUrl} already exists in source: ${urlAlreadyInSource.id}`,
    };
  }

  const { iri, iriFile } = await readIriFromWellKnownDir(workUrl);
  const finalIri = iri || suggestedId;
  const sourceIdAlreadyInSource: SourceInternal | undefined = R.find(
    (s) => s.id === finalIri,
    sources
  );
  if (sourceIdAlreadyInSource) {
    return { error: `That source ID of ${finalIri} already exists.` };
  }

  const iriAlreadyInSource: SourceInternal | undefined = R.find(
    (s) => s.id === finalIri,
    sources
  );
  if (iriAlreadyInSource) {
    return { error: `That IRI of ${finalIri} already exists.` };
  }

  if (!iri) {
    await saveIriToWellKnownDir(workUrl, suggestedId).catch((err) => {
      // Not aborting because I'm unsure that this is catastrophic, and we'll flag cases of missing IRI files in their settings.
      console.log(
        `Got a problem saving the ID ${suggestedId} to the file: ${workUrl}`,
        err
      );
      alert(
        `Got a problem saving the ID ${suggestedId} to the file: ${workUrl} ... so you may have to reload and check the settings for this source.` // eslint-disable-line max-len
      );
    });
  }
  const newSource = {
    id: finalIri,
    idFile: iriFile,
    name,
    workUrl,
    changesAckedDate: new Date().toISOString(),
    dateReviewed: new Date().toISOString(),
    notifyChanged: false,
  };
  return newSource;
};

/**
 param newSource must have unique ID & location
 param suggestedId is a potential IRI ID if there is none
 */
export const dispatchAddSourceToSettings = (
  newSource: SourceInternal
): AppThunk => async (dispatch) => {
  await dispatch(
    dispatchModifySettings(addSourceInternalToSettingsObject(newSource))
  );
  await dispatch(dispatchSaveSettingsTextToFileAndResetObject());
  // If we don't await on reload-cache then drag-drop addition to task-lists will fail to 'show' if you click it.
  await dispatch(dispatchReloadCacheForFile(newSource.id));
  // eslint-disable-next-line no-new
  new Notification('Added', {
    body: `Added that source.`,
    silent: true,
  });
};

export const buildSource = (
  name: string,
  prefix: string,
  filePath: string,
  sources: Array<SourceInternal>
): Promise<SourceInternal | ErrorResult> => {
  const fileUrl = url.pathToFileURL(filePath).toString();
  const newPath = uriTools.bestGuessAtGoodUriPath(filePath);
  const suggestedId = `${prefix}:${newPath}`;
  return setupLocalIri(name, fileUrl, suggestedId, sources);
};

const dispatchBuildSourceAndAddToSettings = (
  name: string,
  prefix: string,
  filePath: string
): AppThunk => async (dispatch, getState) => {
  const fileUrl = url.pathToFileURL(filePath).toString();
  const newPath = uriTools.bestGuessAtGoodUriPath(filePath);
  const suggestedId = `${prefix}:${newPath}`;
  const newSource = await setupLocalIri(
    name,
    fileUrl,
    suggestedId,
    getState().distnet.settings.sources
  );
  if (isErrorResult(newSource)) {
    throw Error(newSource.error);
  } else {
    return dispatch(dispatchAddSourceToSettings(newSource));
  }
};

const nameFromPath = (prefix: string, fullPath: string): string => {
  const parsedPath = path.parse(fullPath);
  const parentPath = path.parse(parsedPath.dir);
  return `Local ${prefix} ${parentPath.base} ${parsedPath.base}`;
};

export const dispatchAddHistoryToSettings = (filePath: string) => {
  const name = nameFromPath('Histories', filePath);
  return dispatchBuildSourceAndAddToSettings(name, 'histories', filePath);
};

export const dispatchAddTaskListToSettings = (filePath: string) => {
  const name = nameFromPath('Tasks', filePath);
  return dispatchBuildSourceAndAddToSettings(name, 'taskyaml', filePath);
};

export const dispatchAddReviewedDateToSettings = (
  sourceId: string
): AppThunk => async (dispatch, getState) => {
  const source = R.find(
    (s) => s.id === sourceId,
    getState().distnet.settings.sources
  );
  if (source) {
    const srcPath = url.fileURLToPath(source.workUrl);
    const destPath = historyDestFullPathFromPath(srcPath);
    return fsExtra
      .copy(srcPath, destPath, {
        preserveTimestamps: true,
        filter: keepHistoryWhileCopying,
      })
      .then(() => {
        return fs.promises.utimes(destPath, new Date(), new Date());
      })
      .then(async () => {
        await dispatch(
          setSettingsSourceReviewedDate({
            source,
            dateReviewed: new Date().toISOString(),
          })
        );
        return dispatch(setChangesAcked(source.id));
      })
      .catch((e) => {
        console.log(
          `Got an error copying ${source.workUrl} to ${destPath} because`,
          e
        );
        return dispatch(
          setSettingsSaveErrorMessage(
            'An error occurred. See dev console for details.'
          )
        );
      });
  }
  return null;
};

export default distnetSlice.reducer;
