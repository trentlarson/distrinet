// This wrapper is to allow this to work as a module in both node and browser.
// eslint-disable-next-line func-names
(function (exports) {
  /**
   * from https://tools.ietf.org/html/rfc3986#section-3
   * also useful is https://en.wikipedia.org/wiki/Uniform_Resource_Identifier#Definition
   * */
  function isGlobalUri(uri) {
    return uri && uri.match(new RegExp(/^[A-Za-z][A-Za-z0-9+.-]+:/));
  }

  /**
   * @return the scheme (before the ':'), or null if it's not a global URI
   */
  function globalUriScheme(uri) {
    if (!isGlobalUri(uri)) {
      console.log(`Cannot find scheme for non-global URI ${uri}`);
      return null;
    }
    return uri.split(':')[0];
  }

  /**
   * Everything after the first '#' symbol.
   * Return null if there is no fragment.
   */
  function uriFragment(uri) {
    const index = uri.indexOf('#');
    if (index === -1) {
      return null;
    }
    return uri.substring(index + 1);
  }

  /**
   * Given an ID within some context, return the URI for it with the ID as a fragment, i.e. uriContext + '#' + id).
   * If the ID is a global URI, just return it.
   * */
  function globalUriForId(id, uriContext) {
    if (isGlobalUri(id)) {
      return id;
    }
    let finalId = id;
    if (id.startsWith('#')) {
      finalId = id.substring(1);
    }
    return `${uriContext}#${finalId}`;
  }

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
   * Find the longest member or uriList that is a prefix of uri, or null if none match.
   * */
  function findClosestUriForGlobalUri(uri, uriList) {
    let maxUri = '';
    for (let i = 0; i < uriList.length; i += 1) {
      const sourceUri = uriList[i];
      if (uri.startsWith(sourceUri) && sourceUri.length > maxUri.length) {
        maxUri = sourceUri;
      }
    }
    if (maxUri !== '') {
      return maxUri;
    }
    return null;
  }

  function isUrlLocal(url) {
    return (
      url &&
      (url.startsWith('file:') ||
        url.startsWith('http://localhost') ||
        url.startsWith('https://localhost') ||
        url.startsWith('http://127.0.0.1') ||
        url.startsWith('https://127.0.0.1'))
    );
  }

  /**
   * Return the same URI but without the query part.
   */
  function removeQuery(uri) {
    // I think this should be change to allow relative references.
    if (isGlobalUri(uri)) {
      const url = new URL(uri);
      url.search = '';
      return url.toString();
    }
    return uri;
  }

  /**
   * Return the same URI but without the fragment.
   */
  function removeFragment(uri) {
    const index = uri.indexOf('#');
    if (index === -1) {
      return uri;
    }
    return uri.substring(0, index);
  }

  exports.findClosestUriForGlobalUri = findClosestUriForGlobalUri;
  exports.isGlobalUri = isGlobalUri;
  exports.isUrlLocal = isUrlLocal;
  exports.globalUriForId = globalUriForId;
  exports.globalUriForResource = globalUriForResource;
  exports.globalUriScheme = globalUriScheme;
  exports.removeQuery = removeQuery;
  exports.removeFragment = removeFragment;
  exports.uriFragment = uriFragment;
})(typeof exports === 'undefined' ? (this.uriTools = {}) : exports);
