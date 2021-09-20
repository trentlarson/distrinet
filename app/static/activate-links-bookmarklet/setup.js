// Original is here: http://familyhistories.info/static/tools/activate-links-bookmarklet/setup.js

// Tool to highlight microdata-tagged text

// v2: modified microdata to use schema.org & link & href (rather than historical-data.org & meta & content) a la https://schema.org/docs/gs.html#schemaorg_expected

// To run this on a fully local setup (ie. without a network connection):
// - change the bookmarkletFilesLoc to point to your location
// - change the '$.getScript' calls into 'localScript' calls (to get around the OPTION call and CORS)


// by Jaykesh Patel on http://stackoverflow.com/questions/14644558/call-javascript-function-after-script-is-loaded
function loadScript( url, callback ) {
  var script = document.createElement( "script" )
  script.type = "text/javascript";
  if(script.readyState) {  //IE
    script.onreadystatechange = function() {
      if ( script.readyState === "loaded" || script.readyState === "complete" ) {
        script.onreadystatechange = null;
        callback();
      }
    };
  } else {  //Others
    script.onload = function() {
      callback();
    };
  }

  script.src = url;
  document.getElementsByTagName( "head" )[0].appendChild( script );
}




// These variables might be set in an application that includes this script.
// For example, the Distrinet HistoryPage electron references are different from public references.

// The bookmarkletFilesLoc is the directory containing this 'setup.js' file.
if (typeof bookmarkletFilesLoc === 'undefined') {
  bookmarkletFilesLoc = "https://familyhistories.info/static/tools/activate-links-bookmarklet";

  // You can use this approach by running an http server from the root of the repo:
  //bookmarkletFilesLoc = "http://localhost:8080/static/tools/activate-links-bookmarklet";
  //
  // Local file:/// URLs no longer work due to new CORS restrictions:
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS/Errors/CORSRequestNotHttp
  // I couldn't even get them to work with the security turned off in Firefox & Chrome.
}


// The nonHttpFilePrefix is for URIs other than HTTP & file, URIs that should be interpreted (e. by a Distrinet lookup).
if (typeof nonHttpFilePrefix === 'undefined') {
  nonHttpFilePrefix = null;
}


// The nonHttpFileSameWindow is to enforce a load in the same window, not a new one (eg. for a Distrinet genealogy).
if (typeof nonHttpFileSameWindow === 'undefined') {
  nonHttpFileSameWindow = false;
}


var jqueryScriptLoc = bookmarkletFilesLoc + "/js/jquery-1.5.min.js";

var addHoverLinks = function() {

  $("head").append("<link rel='stylesheet' type='text/css' media='screen' href='" + bookmarkletFilesLoc + "/css/jquery-ui-1.8.5.custom.css'>");
  $("head").append("<link rel='stylesheet' type='text/css' media='screen' href='" + bookmarkletFilesLoc + "/css/jquery.ui.ppmenu.css'>");
  $("head").append("<link rel='stylesheet' type='text/css' media='screen' href='" + bookmarkletFilesLoc + "/css/ppmenu.css'>");

  $.getScript(bookmarkletFilesLoc + "/js/jquery-ui-1.8.8.custom.min.js", function() {
    $.getScript(bookmarkletFilesLoc + "/js/jquery.ui.prettypiemenu.js", function() {

      $('span[itemtype|="https://schema.org/Person"]')
        .css('border-bottom','3px dotted blue');

      $('span[itemtype|="https://schema.org/Person"]')
        .each(function(personNum) {
          var urls = $('link[itemprop|=url]', this);
          if (urls.length === 0) {
            console.log("Found a schema.org/Person with no link URLs inside.  Ignoring it.");
          } else {
            var buttonInfo = [];
            var urlInfo = [];
            var urlPieces, domain;
            for (var i = 0; i < urls.length; i++) {
              // Let's determine the title text.
              var thisUrl = urls[i].href;
              var scheme = thisUrl.split(":")[0].toLowerCase();
              var remaining = thisUrl.substring(scheme.length + 1);
              if (scheme.startsWith('http')) {
                scheme = "Visit";
              } else if (scheme.startsWith('file')) {
                scheme = "Load file";
              }

              // Now, try for the domain.
              // it is probably element 2 or 3 (eg. from http://xyz or file:///xyz)
              var nextPart = remaining; // default to everything
              urlPieces = remaining.split("/");
              for (var partNum = 0; partNum < urlPieces.length; partNum++) {
                if (urlPieces[partNum]) {
                  nextPart = urlPieces[partNum];
                  break;
                }
              }

              var title = scheme + " " + nextPart;

              buttonInfo.push({img:'ui-icon-check', title:title});
              urlInfo.push(thisUrl);
            }
            var openUrlFun = function(urls) {
              var result = function(itemNum) {
                console.log("opening " + urls[itemNum]);
                var url = urls[itemNum];
                var external = url.startsWith("http") || url.startsWith("file");
                if (external || !nonHttpFilePrefix) {
                  window.open(url, "_linkWindow");
                } else {
                  var otherUrl = nonHttpFilePrefix + encodeURIComponent(url);
                  if (nonHttpFileSameWindow) {
                    location.replace(otherUrl);
                  } else {
                    window.open(otherUrl, "_linkWindow");
                  }
                }
              };
              return result;
            }(urlInfo);
            // Bug: with only one selection button in the pie, prettypie UI puts the link graphic too high.
            $(this).prettypiemenu({
              buttons: buttonInfo,
              onSelection: openUrlFun,
              showTitles: true
            });

            $(this).mouseenter(function(event) {
              event.preventDefault();
              var offset = $(this).offset();
              var middleY = offset.top + $(this).height()/2;
              var middleX = offset.left + $(this).width()/2;
              $(this).prettypiemenu("show", {top: middleY, left: middleX});
            });
          }
        });
    });
  });
};


// Now load our scripts and run them.
loadScript(jqueryScriptLoc, addHoverLinks);


