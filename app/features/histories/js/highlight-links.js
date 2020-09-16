// Original is here: http://familyhistories.info/tools/activate-links-bookmarklet/setup.js

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



var bookmarkletFilesLoc = "http://familyhistories.info/tools/activate-links-bookmarklet";
var jqueryScriptLoc = bookmarkletFilesLoc + "/js/jquery-1.5.min.js";

var addHoverLinks = function() {

  $("head").append("<link rel='stylesheet' type='text/css' media='screen' href='" + bookmarkletFilesLoc + "/css/jquery-ui-1.8.5.custom.css'>");
  $("head").append("<link rel='stylesheet' type='text/css' media='screen' href='" + bookmarkletFilesLoc + "/css/jquery.ui.ppmenu.css'>");
  $("head").append("<link rel='stylesheet' type='text/css' media='screen' href='" + bookmarkletFilesLoc + "/css/ppmenu.css'>");

  $.getScript(bookmarkletFilesLoc + "/js/jquery-ui-1.8.8.custom.min.js", function() {
    $.getScript(bookmarkletFilesLoc + "/js/jquery.ui.prettypiemenu.js", function() {

      $('span[itemtype|="http://historical-data.org/Person"]')
        .css('border-bottom','3px dotted blue');

      $('span[itemtype|="http://historical-data.org/Person"]')
        .each(function(personNum) {
          var urls = $('meta[itemprop|=url]', this);
          if (urls.length === 0) {
            console.log("Found a historical-data.org/Person with no meta URLs inside.  Ignoring it.");
          } else {
            var buttonInfo = [];
            var urlInfo = [];
            var urlPieces, domain;
            for (var i = 0; i < urls.length; i++) {
              urlPieces = urls[i].content.split("/");
              // it's probably either element 2 or 3 (from http://xyz or file:///xyz)
              domain = urlPieces[2];
              if (domain === "") {
                domain = urlPieces[3];
              }
              buttonInfo.push({img:'ui-icon-check', title:domain});
              urlInfo.push(urls[i].content);
            }
            var openUrlFun = function(urls) {
              var result = function(itemNum) { console.log("opening " + urls[itemNum]); window.open(urls[itemNum], "_linkWindow"); };
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


