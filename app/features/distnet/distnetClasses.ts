/**
 * Structures for the URI mappings
 *
 * Spec: https://w3c.github.io/did-core
 * */

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
  didDoc?: DidDoc;
  urls?: Array<UrlData>;
}

/** Cached-file info * */

export interface CacheData {
  sourceId: string;
  localFile: string;
  contents: string;
  date: string;
}
// // The type of the keys is string
// interface Cache {
//   [sourceId: string]: CacheData;
// }

/** Utilities * */

export interface Error {
  error: string;
}

export interface Payload<T> {
  type: string;
  payload: T;
}

const APP_NAME = 'dist-task-lists';

// Why does linting complain if I don't "export default"?
// eslint-disable-next-line import/prefer-default-export
export { APP_NAME };
