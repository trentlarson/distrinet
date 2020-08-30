// This wrapper is to allow this to work as a module in both node and browser.
// eslint-disable-next-line func-names
(function (exports) {
  /**
    // Hypothetical URI resolver object for results (and maybe for inputs)

    // The URI for a file currently being referenced
    contextUri
    // The smaller URI (ie. a fragment) when inside the contextUri
    localUri
    // The full, global URI
    globalUri
  * */

  // gott replace all uses of these to point to distnet instead of here
  // eslint-disable-next-line global-require
  const { globalUriForId, isGlobalUri } = require('../../distnet/uriTools');

  /**
   * @param someUri should be a URI or some portion, starting with "/" or "?" or "#"
   * @param uriContext is the current document URI
   * */
  function globalUriForResource(someUri, uriContext) {
    if (
      someUri &&
      (someUri.startsWith('#') ||
        someUri.startsWith('/') ||
        someUri.startsWith('?'))
    ) {
      return uriContext + someUri;
    }
    return someUri;
  }

  /**
   * Return an equivalent FamilySearch URI, eg for persons/ABC-DEF and persons/ABC-DEF#ABC-DEF
   */
  function equivFSUri(uri) {
    const PREFIX = '/platform/tree/persons/';
    const parsedUri = new URL(uri);
    if (
      parsedUri.host === 'api.familysearch.org' &&
      parsedUri.pathname.startsWith(PREFIX) &&
      parsedUri.hash &&
      parsedUri.pathname.split('/').pop() === parsedUri.hash.substring(1)
    ) {
      parsedUri.hash = '';
      return [parsedUri.toString()];
    }
    return [];
  }

  /**
   * Clean up those stupid FamilySearch URIs with ""?flag=fsh" on the end.
   */
  function removeQuery(uri) {
    if (isGlobalUri(uri)) {
      const url = new URL(uri);
      url.search = '';
      return url.toString();
    }
    return uri;
  }

  /**
   * Some contexts allow multiple representations, eg. see equivFSUri
   */
  function equal(uri1, uri2) {
    const equivUri1 = [uri1].concat(equivFSUri(uri1));
    const equivUri2 = [uri2].concat(equivFSUri(uri2));
    // now see if there's any overlap
    for (let i = 0; i < equivUri2.length; i += 1) {
      if (equivUri1.includes(equivUri2[i])) {
        return true;
      }
    }
    return false;
  }

  exports.equal = equal;
  exports.globalUriForResource = globalUriForResource;
  exports.globalUriForId = globalUriForId;
  exports.isGlobalUri = isGlobalUri;
  exports.removeQuery = removeQuery;
})(typeof exports === 'undefined' ? (this.uriTools = {}) : exports);
