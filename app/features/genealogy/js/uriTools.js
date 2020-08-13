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
   * from https://en.wikipedia.org/wiki/Uniform_Resource_Identifier#Definition
   * */
  function isGlobalUri(string) {
    return string && string.match(new RegExp(/^[A-Za-z][A-Za-z0-9+.-]*:/));
  }

  /**
   * Given an ID within some context, return the URI for it (ie. including the fragment)
   * */
  function globalUriForId(id, uriContext) {
    if (isGlobalUri(id)) {
      return id;
    }
    return `${uriContext}#${id}`;
  }

  exports.globalUriForResource = globalUriForResource;
  exports.globalUriForId = globalUriForId;
  exports.isGlobalUri = isGlobalUri;
})(typeof exports === 'undefined' ? (this.uriTools = {}) : exports);
