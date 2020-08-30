// This wrapper is to allow this to work as a module in both node and browser.
// eslint-disable-next-line func-names
(function (exports) {
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
    let finalId = id;
    if (id.startsWith('#')) {
      finalId = id.substring(1);
    }
    return `${uriContext}#${finalId}`;
  }

  exports.isGlobalUri = isGlobalUri;
  exports.globalUriForId = globalUriForId;
})(typeof exports === 'undefined' ? (this.uriTools = {}) : exports);
