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
  settingsChanged: boolean;
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
  name?: string;
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

/**
 * This is a good candidate for extensions, eg. privateKeyFile
 */
interface Credential {
  id?: string; // typically only used in the top-level credentials
  type?: CredentialType;
  value?: string; // useful for auth tokens
  did?: string; // DID (Decentralized ID)

  // from keyObjectexport with type 'pkcs8' and format 'pem'
  // see https://nodejs.org/dist/latest-v12.x/docs/api/crypto.html#crypto_keyobject_export_options
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
  // whichever URL was used as the source
  sourceUrl: string;
  // local path (not URL, ie without "file://")
  localFile: string;
  // non-null if small enough to fit all file contents in memory
  contents: string;
  // date the local copy on disk was last updated
  date: string; // this is a string so that it can be serialized, eg. into the Redux state
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
