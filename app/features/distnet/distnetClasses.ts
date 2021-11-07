export const APP_NAME = 'dist-task-lists';

/**
 * This is the main object stored into the state with the name 'distnet'.
 * */
export interface DistnetState {
  settings: SettingsInternal;
  settingsChanged: boolean;
  settingsErrorMessage: string | null;
  settingsText: string | null;
  settingsSaveErrorMessage: string | null;
  cache: Cache; // cache for source info
  cacheErrorMessage: string | null;
}

// Settings saved to disk, eg. without an ID
export interface SettingsForStorage {
  sources: Array<SourceForStorage>;
  resourceTypes: Array<ResourceType>;
  credentials: Array<Credential>;
}

// If you change this, remember to change: convertSourceToInternalFromStorage, convertSourceToStorageFromInternal
export interface SourceForStorage {
  name?: string;
  type?: string; // type of transfer/storage/sharing
  urls?: Array<UrlData>;
  workUrl: string;
  // most recent date of changes that were acknowledged by the user, ISO-formatted
  changesAckedDate: string; // this is a string so that it can be serialized, eg. into the Redux state
}

// Full Settings, built in memory
export interface SettingsInternal extends SettingsForStorage {
  sources: Array<SourceInternal>;
}

// If you change this, remember to change: convertSourceToInternalFromStorage, convertSourceToStorageFromInternal
export interface SourceInternal extends SourceForStorage {
  id: string;
  idFile: string; // a file path (which the UI often renders as a "file:" URL, probably when it's in an href)
  // whether there are changes since the changesAckedDate
  notifyChanged: boolean;

  // date of the file when most recently reviewed (from historical timestamp), ISO-formatted
  dateReviewed: string | null; // this is a string so that it can be serialized, eg. into the Redux state
}

/** not yet ready

// Spec: https://w3c.github.io/did-core

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

* */

export interface UrlData {
  url: string;
  credentials?: Credential;

  // A folder typically has one method for synchronizing via tools.
  // In addition, it might be copied on demand manually or via Distrinet.
  syncMethod?: SyncMethod;
}

export enum SyncMethod {
  // default method (if not set) could be some manual copy or via Distrinet
  GIT = 'GIT',
  DROPBOX = 'DROPBOX',
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
  encryptedPkcs8PemPrivateKey?: string;

  ivBase64?: string; // required for encryptedPkcs8PemPrivateKey
  salt?: string; // if empty, will often use ''
}

export enum CredentialType {
  TOKEN = 'TOKEN',
  PRIVATE_KEY = 'PRIVATE_KEY',
}

export interface ResourceType {
  matcher: string; // string found before first ':' (eg. 'gedcomx') or after last '.' (eg. 'html')
  executablePath: string;
}

/** Cached-file info for each source * */

export interface Cache {
  [sourceId: string]: CacheData;
}

export interface CacheData {
  // local path (not URL, ie without "file://")
  localFile: string;
  sourceId: string;
  // whichever URL was used as the source
  sourceUrl: string;

  // ISO-formatted date the local copy on disk was updated (when last checked)
  // (There's a possibility that it has been updated since it was checked.)
  updatedDate: string; // this is a string so that it can be serialized, eg. into the Redux state

  // for a file, the contents of the file
  contents?: string;

  // for a directory, these are the files with new changes in the current copies
  // for a file, []
  fileCache: Array<ChangedFile>;
}

export interface ChangedFile {
  // path of the file below sourceUrl (without a beginning '/')
  file: string;
  // ISO-formatted date the local copy on disk was updated (when last checked)
  mtime: string; // this is a string so that it can be serialized, eg. into the Redux state
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
