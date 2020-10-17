// This wrapper is to allow this to work as a module in both node and browser.
// eslint-disable-next-line func-names
(function (exports) {
  /**
   * from https://tools.ietf.org/html/rfc3986#section-3
   * also useful is https://en.wikipedia.org/wiki/Uniform_Resource_Identifier#Definition
   * */
  function isGlobalUri(uri) {
    return uri && uri.match(new RegExp(/^[A-Za-z][A-Za-z0-9+.-]*:/));
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
   * Given an ID within some context, return the URI for it (ie. including the fragment)
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

  exports.findClosestUriForGlobalUri = findClosestUriForGlobalUri;
  exports.isGlobalUri = isGlobalUri;
  exports.globalUriForId = globalUriForId;
  exports.globalUriScheme = globalUriScheme;
})(typeof exports === 'undefined' ? (this.uriTools = {}) : exports);
