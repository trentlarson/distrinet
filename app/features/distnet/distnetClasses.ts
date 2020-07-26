/**
 * Structures for the URI mappings
 *
 * Spec: https://w3c.github.io/did-core
 * */

/**
 * This is the main object stored into the state with the name 'distnet'.
 * */
export interface DistnetState {
  settings: Settings;
  settingsErrorMessage: string | null;
  settingsText: string | null;
  settingsSaveErrorMessage: string | null;
  cache: Cache;
  cacheErrorMessage: string | null;
}

export interface Settings {
  sources: Array<Source>;
  resourceTypes: ResourceTypes;
}

export interface Source {
  name: string;
  id: string;
  type: string | undefined;
  didDoc: DidDoc | undefined;
  urls: Array<UrlData> | undefined;
}

interface DidDoc {
  // This is for the '@context'
  didDocContext: DidDocContext;
  id: string;
  // authentication: array
  // service: array
}

enum DidDocContext {
  V1 = 'https://www.w3.org/ns/did/v1',
}

export interface UrlData {
  url: string;
  credentials: Credential;
}

interface Credential {
  type: string;
  value: string;
  privateKeyFile: string;
}

export interface ResourceTypes {
  [sourceProtocol: string]: Executable;
}

export interface Executable {
  executablePath: string;
}

/** Cached-file info * */

// The type of the keys is string
export interface Cache {
  [sourceId: string]: CacheData;
}

export interface CacheData {
  sourceId: string;
  sourceUrl: string; // whichever URL was used as the source
  localFile: string; // local path, without "file:"
  contents: string;
  date: string;
}

/** Utilities * */

export interface Payload<T> {
  type: string;
  payload: T;
}

const APP_NAME = 'dist-task-lists';

export { APP_NAME };
