(function(exports){

  const $ = require("./jquery-2.2.4.min.js");
  const R = require('./ramda-0.25.0.min.js');
  const uriTools = require("./uriTools.js");
  const mapperModule = require('../samePerson');
  const MapperBetweenSets = mapperModule.default;

  var cache = null;
  function setCache(_cache) {
    cache = _cache;
  }

  // Walk tree with getTree & walkTree

  // let's remove these globals and pass around explicitly for thread safety (& more clarity)
  // (treeObj is an app global... can we fix that?)
  var asyncCount = 0;
  /**
   * @param uri URI of the individual (null and '' will be ignored)
   */
  function getTree(uri) {
    if (!uri) {
      return;
    }
    asyncCount = 0;
    getTree2(uri, 0, null);
  }

  /**
   * @param uri URI of the individual, non-null
   * @param node container for the derived info to display
   */
  function getTree2(uri, generationCount, node) {
    if (!uri) {
      return;
    }

    if (!node) {
      node = { id: null, prefixUri: "", fullUri: uri, name: null, _parents: [], _children: [], portrait: null }
    }

    markStart();

    if (uri.toLowerCase().startsWith("http:")
        || uri.toLowerCase().startsWith("https:")) {
      // HTTP is just a special case of a URI so we can eliminate this separation someday
      fetch(uri, {headers: {Accept: 'application/x-gedcomx-v1+json'}})
        .then(function(response) {
          return response.json();
        })
        .then(function(gedcomx) {
          try {
            walkTree(uri, gedcomx, generationCount, node, 0, uri)
          } catch (e) {
            // An error from walkTree stops ".always" from working.
            // Marking finished inside a 'finally' doesn't always work.
            // Reproduce with https://raw.githubusercontent.com/misbach/familytree/master/people/KWCJ-RN4/KWCJ-RN4.json
            console.error("Error in walkTree for URL", uri, e)
          }
        })
        .finally(() => {
          markFinished(node);
        });

    } else {
      if (cache[uri]) {
        // the URI matches exactly, so the file is dedicated to this person
        if (cache[uri].contents) {
          try {
            let gedcomx = JSON.parse(cache[uri].contents)
            walkTree(uri, gedcomx, generationCount, node, 0, uri)
          } catch (e) {
            console.error("Error in cached walkTree for URI", uri, e);
          }
        } else {
          console.error("Found no contents in cache for source URI", uri)
        }

      } else {
        // check if any of the cache URIs are the prefix of the given URI
        let keys = Object.keys(cache);
        let prefixUri = null;
        for (let i = 0; i < keys.length && prefixUri === null; i++) {
          if (uri.startsWith(keys[i])) {
            prefixUri = keys[i];
          }
        }
        if (prefixUri) {
          try {
            let gedcomx = JSON.parse(cache[prefixUri].contents)

            // find the person record
            let personIndex = -1;
            for (let i = 0; i < gedcomx.persons.length && personIndex === -1; i++) {
              if (uriTools.globalUriForId(gedcomx.persons[i].id, prefixUri) === uri) {
                personIndex = i;
                break;
              }
            }
            if (personIndex > -1) {
              node.prefixUri = prefixUri;
              walkTree(gedcomx.persons[personIndex].id, gedcomx, generationCount, node, personIndex, prefixUri)
            }
          } catch (e) {
            console.error("Error in cached walkTree for URI", uri, e);
          }
        } else {
          console.error("Found no cached data for source URI", uri)
        }
      }
      markFinished(node);
    }

  }

  function markStart() {
    asyncCount++;
  }

  function markFinished(node) {
    asyncCount--;
    // Detect when finished
    if (asyncCount == 0 ) {
      treeObj = node;
      console.log("treeObj", treeObj);
      // Notify D3 to render the tree
      if (treeObj.id) {
        document.dispatchEvent(new Event('treeComplete'));
      } else {
        console.error("Found no valid treeObj data so will not draw on canvas.");
        // Should dispatch an event that shows a "not found" message.
      }
    }
  }

  function walkTree(id, gedcomx, generationCount, node, personIndex, uriContext) {

    // Root info
    if (!node.id) {
      node.id = gedcomx.persons[personIndex].id;
    }
    if (!node.name) {
      node.name = gedcomx.persons[personIndex].display.name;
      // timeout is for React-type frameworks where this runs before the HTML has rendered (ugly)
      setTimeout(() => $('.person_name').html(gedcomx.persons[personIndex].display.name+' - <a href="person.html?id='+id+'">View Profile</a>'), 500);
    }

    // Find current person in json tree (node)
    var tmpNode = find(node, id, uriContext);

    // Set the portrait picture
    if (gedcomx.persons[personIndex].links
        && gedcomx.persons[personIndex].links.portrait
        && gedcomx.persons[personIndex].links.portrait.href) {
      tmpNode.portrait = gedcomx.persons[personIndex].links.portrait.href;
    }

    // Get Parents
    if (gedcomx.persons[personIndex].display.familiesAsChild) {
      var parents = getParents(gedcomx.persons[personIndex].display.familiesAsChild[0], gedcomx.persons, uriContext);

      if (parents.father) {
        tmpNode._parents.push({id: parents.father.url, name: parents.father.name, _parents: []});
      }
      if (parents.mother) {
        tmpNode._parents.push({id: parents.mother.url, name: parents.mother.name, _parents: []});
      }
      tmpNode.lifespan = gedcomx.persons[personIndex].display.lifespan;
      tmpNode.birthPlace = gedcomx.persons[personIndex].display.birthPlace;
    }

    // Get children of root person only
    // TODO Get multiple generations of descendants
    if (generationCount == 0
        && gedcomx.persons[personIndex].display
        && gedcomx.persons[personIndex].display.familiesAsParent
        && gedcomx.persons[personIndex].display.familiesAsParent[0].children
        && gedcomx.persons[personIndex].display.familiesAsParent[0].children.length > 0) {
      node._children = getChildren(gedcomx.persons[personIndex].display.familiesAsParent[0].children, gedcomx.persons, uriContext);
    }

    // gather explicit person link
    var personIdResources = []
    if (gedcomx.persons[personIndex].links
        && gedcomx.persons[personIndex].links.person
        && gedcomx.persons[personIndex].links.person.href) {
      let href = gedcomx.persons[personIndex].links.person.href;
      // ... and, since FamilySearch adds an annoying inconsequential "?flag=fsh", remove it
      const suffix = "?flag=fsh";
      if (href.endsWith(suffix)) {
        href = href.substring(0, href.length - suffix.length);
      }
      personIdResources = [{
        resource: href,
        description: 'Link to FamilySearch GedcomX',
        format: 'gedcomx'
      }]
    }
    // add other explicit ones (which may include non-gedcomx records)
    let otherIdResources = [];
    if (gedcomx.persons[personIndex].links
        && gedcomx.persons[personIndex].links.otherLocations
        && gedcomx.persons[personIndex].links.otherLocations.resources) {
      otherIdResources = gedcomx.persons[personIndex].links.otherLocations.resources;
    }
    // now include any other gedcomx IDs already known, possibly from reverse pointers
    let knownIds = MapperBetweenSets.retrieveFor(uriTools.globalUriForId(id, uriContext));
    let knownIdResources = knownIds
        ? R.map(uri => ({resource: uri, description: 'Known (maybe private) GedcomX', format: 'gedcomx'}), knownIds)
        : [];
    let allLocations =
      R.unionWith((a,b) => a.resource === b.resource,
                  personIdResources,
                  R.concat(otherIdResources, knownIdResources));
    // now remove one the one we're already on (which can happen for the links.person.href)
    let allLocationsButThis =
        R.reject(a => a.resource == uriTools.globalUriForId(id, uriContext),
                 allLocations);
    tmpNode.otherLocations = allLocationsButThis;

    // Stop after 4 generations
    if (generationCount < 5
        && parents) {
      if (parents.father) {
        getTree2(parents.father.url, generationCount + 1, node);
      }
      if (parents.mother) {
        getTree2(parents.mother.url, generationCount + 1, node);
      }
    }
  }

  // Find person by ID in json object tree
  function find(obj, id, uriContext) {
    if (uriTools.globalUriForId(id, uriContext) === uriTools.globalUriForId(obj.id, uriContext)
        || uriTools.globalUriForId(id, uriContext) === obj.fullUri) return obj;
    for (let i = 0; i < obj._parents.length; i ++) {
      var result = find(obj._parents[i], id, uriContext);
      if (result) return result;
    }
    return null;
  }

  // Get children: Get their IDs from the display->familiesAsParent object. Get their names from the persons array.
  function getChildren(childResources, persons, uriContext) {
    var children = [];
    // Iterate all children
    for (let j=0; j < childResources.length; j++) {
      // Get name of child: Assume living if person not found in persons array
      for (let i=1; i<persons.length; i++) {
        if (uriTools.globalUriForResource(childResources[j].resource, uriContext)
            === uriTools.globalUriForId(persons[i].id, uriContext)) {
          children.push({ id: childResources[j].resource, name: persons[i].display.name });
        } else if (uriTools.globalUriForId(childResources[j].resourceId, uriContext)
                   === uriTools.globalUriForId(persons[i].id, uriContext)) {
          children.push({ id: childResources[j].resourceId, name: persons[i].display.name });
        }
      }
    }
    return children;
  }

  // Get the parents: Get their IDs from the display->familiesAsChild object. Get their names from the persons array.
  function getParents(family, persons, uriContext) {

    var parents = {father: null, mother: null};

    // Iterate all persons
    for (let i=1; i<persons.length; i++) {
      let uriForNextPerson = uriTools.globalUriForId(persons[i].id, uriContext);

      // Look for first parent
      const parent1ResourceUri = uriTools.globalUriForResource(family.parent1.resource, uriContext);
      // only testing for resourceId because the other fails on FamilySearch and this might be in the same file
      const parent1IdUri = uriTools.globalUriForId(family.parent1.resourceId, uriContext);
      if (uriForNextPerson == parent1ResourceUri
          || uriForNextPerson == parent1IdUri) {
        // Detect Father/Mother by gender
        if (persons[i].gender.type == "http://gedcomx.org/Male") {
          parents.father = {id: persons[i].id, name: persons[i].display.name, url: uriTools.globalUriForResource(family.parent1.resource, uriContext)};
        } else {
          parents.mother = {id: persons[i].id, name: persons[i].display.name, url: uriTools.globalUriForResource(family.parent1.resource, uriContext)};
        }
      }

      // Look for second parent
      const parent2ResourceUri = uriTools.globalUriForResource(family.parent2.resource, uriContext);
      // only testing for resourceId because the other fails on FamilySearch and this might be in the same file
      const parent2IdUri = uriTools.globalUriForId(family.parent2.resourceId, uriContext);
      if (uriForNextPerson == parent2ResourceUri
          || uriForNextPerson == parent2IdUri) {
        // Detect Father/Mother by gender
        if (persons[i].gender.type == "http://gedcomx.org/Male") {
          parents.father = {id: persons[i].id, name: persons[i].display.name, url: uriTools.globalUriForResource(family.parent2.resource, uriContext)};
        } else {
          parents.mother = {id: persons[i].id, name: persons[i].display.name, url: uriTools.globalUriForResource(family.parent2.resource, uriContext)};
        }
      }

    }
    return parents;
  }

  // Get Query parameters
  function getQueryParams() {
    const vars = [];
    let hash;
    const hashes = window.location.href
          .slice(window.location.href.indexOf('?') + 1)
          .split('&');
    for (let i = 0; i < hashes.length; i++) {
      hash = hashes[i].split('=');
      vars.push(hash[0]);
      vars[hash[0]] = hash[1];
    }
    // removed the default location because we now want to know when it's not supplied
    return vars;
  }


  exports.setCache = setCache;
  exports.getTree = getTree;
  exports.getQueryParams = getQueryParams;

}(typeof exports === 'undefined' ? this.tree = {} : exports));
