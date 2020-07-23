/**
 * Structures for the URI mappings
 *
 * Spec: https://w3c.github.io/did-core
 * */

export interface Executable {
  executablePath: string;
}

export interface ResourceTypes {
  [sourceProtocol: string]: Executable;
}

export interface Settings {
  sources: Array<Source>;
  resourceTypes: ResourceTypes;
}

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

enum DidDocContext {
  V1 = 'https://www.w3.org/ns/did/v1',
}
interface DidDoc {
  // This is for the '@context'
  didDocContext: DidDocContext;
  id: string;
  // authentication: array
  // service: array
}
interface Credential {
  type: string;
  value: string;
  privateKeyFile: string;
}
export interface UrlData {
  url: string;
  credentials: Credential;
}
export interface Source {
  name: string;
  id: string;
  type: string | undefined;
  didDoc: DidDoc | undefined;
  urls: Array<UrlData> | undefined;
}

/** Cached-file info * */

export interface CacheData {
  sourceId: string;
  sourceUrl: string;
  localFile: string; // local path, without "file:"
  contents: string;
  date: string;
}

// The type of the keys is string
export interface Cache {
  [sourceId: string]: CacheData;
}

/** Utilities * */

export interface Payload<T> {
  type: string;
  payload: T;
}

const APP_NAME = 'dist-task-lists';

// Why does linting complain if I don't "export default"?
// eslint-disable-next-line import/prefer-default-export
export { APP_NAME };
