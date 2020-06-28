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
interface UrlData {
  url: string;
  credentials: Credential;
}
interface Source {
  name: string;
  id: string;
  didDoc?: DidDoc;
  urls?: Array<urlData>;
}
interface Sources {
  sources: Array<Source>;
}

/** Cached-file info * */

interface CacheData {
  sourceId: string;
  localFile: string;
  contents: string;
  date: string;
}
interface Cache {
  [sourceId: string]: CacheData;
}

const APP_NAME = 'dist-task-lists';

// Why does linting complain if I don't "export default"?
// eslint-disable-next-line import/prefer-default-export
export { APP_NAME };
