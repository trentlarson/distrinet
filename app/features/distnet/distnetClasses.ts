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
  credentials: Array<Credential>;
}

export interface Source {
  name: string;
  id: string;
  type?: string;
  didDoc?: DidDoc;
  urls: Array<UrlData>;
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
  writeMethod: WriteMethod;
}

export enum WriteMethod {
  DIRECT_TO_FILE = 'DIRECT_TO_FILE',
}

interface Credential {
  id?: string; // typically only used in the top-level credentials
  type?: CredentialType;
  value?: string;
  privateKeyFile?: string;
  privateKeyPkcs8Pem?: string;
}

export enum CredentialType {
  TOKEN = 'TOKEN',
  PRIVATE_KEY = 'PRIVATE_KEY',
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
  // this is a string so that it can be serialized, eg. into the Redux state
  date: string;
}

export class CacheWrapper {
  private cache: Cache;

  constructor(_cache: Cache) {
    this.cache = _cache;
  }

  getKeys(): Array<string> {
    return Object.keys(this.cache);
  }

  valueFor(key: string): CacheData {
    return this.cache[key];
  }
}

/** Utilities * */

export interface Payload<T> {
  type: string;
  payload: T;
}

const APP_NAME = 'dist-task-lists';

export { APP_NAME };
