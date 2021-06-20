(function(exports){

  const $ = require('./jquery-2.2.4.min.js');
  const R = require('./ramda-0.25.0.min.js');
  const uriTools = require('./uriTools.js');
  const loader = require('../../distnet/cache.ts');
  const mapperModule = require('../samePerson');
  const MapperBetweenSets = mapperModule.default;

  var sources = [];
  function setSources(_sources) {
    sources = _sources;
  }

  // Walk tree with getTree & walkTree

  // let's remove these globals and pass around explicitly for thread safety (& more clarity)
  // (treeObj is an app global... can we fix that?)
  var asyncCount = 0;
  var fullTree = {};
  /**
   * @param uri URI of the individual (null and '' will be ignored)
   */
  function getTree(uri) {
    if (!uri) {
      return;
    }
    asyncCount = 0;
    fullTree = MapperBetweenSets.retrieveAllIdRecords();
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

    if (uriTools.isGlobalUri(uri)
        && (uri.toLowerCase().startsWith("file:")
            || uri.toLowerCase().startsWith("http:")
            || uri.toLowerCase().startsWith("https:"))) {
      // FILE & HTTP are just special cases of URIs so we can eliminate this separation someday
      var myHeaders = {
        Accept: 'application/json, application/x-gedcomx-v1+json',
        // Sometimes the FamilySearch API returns XML when these are non-empty.  Why?
        'If-None-Match': '',
        'If-Modified-Since': null
      }
      fetch(uri, {headers: myHeaders})
        .then(function(response) {
          if (response.ok) {
            return response.text();
          } else if (response.status === 401) {
            let errorMessage = "Authorization failed retrieving URL " + uri
            + "  This often happens when the fssessionid is lost so try pasting that in again (under Settings on this page)."
            + "  It also happens with familysearch.org or www.familysearch.org URLs, even though api.familysearch.org URLs work.  Frustrating!";
            throw Error(errorMessage);
          } else {
            let errorMessage = "Got error status " + response.status + " retrieving URL " + uri;
            throw Error(errorMessage);
          }
        })
        .then(function(body) {
          //console.log('From uri', uri, 'got response:', body);
          var gedcomx = JSON.parse(body);
          var thisId = uri;
          var thisContext = uri;
          var fragmentId = uriTools.uriFragment(uri);
          if (fragmentId && fragmentId.length > 0) {
            thisId = fragmentId;
            thisContext = uriTools.removeFragment(uri);
          }
          let personIndex = findIndexInGedcomxPersons(uri, thisContext, gedcomx);
          try {
            walkTree(thisId, gedcomx, generationCount, node, personIndex, thisContext)
          } catch (e) {
            // An error from walkTree stops ".always" from working.
            // Marking finished inside a 'finally' doesn't always work.
            // Reproduce with https://raw.githubusercontent.com/misbach/familytree/master/people/KWCJ-RN4/KWCJ-RN4.json
            console.error("Error in walkTree for URL", uri, e)
          }
        })
        .catch((error) => {
          console.error("Error retrieving or parsing results from URL:", uri, error);
        })
        .finally(() => {
          markFinished(node);
        });

    } else {

      const source = R.find((src) => src.id === uri, sources);
      if (source && source.urls) {
        loader.loadOneSourceContents(source)
          .then((cacheData) => {
            if (cacheData) {
              try {
                let gedcomx = JSON.parse(cacheData.contents)
                walkTree(uri, gedcomx, generationCount, node, 0, uri)
              } catch (e) {
                console.error("Error in source walkTree for URI", uri, e);
              }
            }
          })
          .catch((err) => {
            console.error("Got an error loading source", source, err);
          })
      } else {
        // check if any of the cache URIs are the prefix of the given URI
        let keys = sources.map((source) => source.id);
        let prefixUri = null;
        for (let i = 0; i < keys.length && prefixUri === null; i++) {
          if (uri.startsWith(keys[i])) {
            prefixUri = keys[i];
          }
        }
        if (prefixUri) {
          try {

            const source = R.find((src) => src.id === prefixUri, sources);
            loader.loadOneSourceContents(source)
              .then((cacheData) => {
                if (cacheData) {
                  try {
                    let gedcomx = JSON.parse(cacheData.contents)

                    // find the person record
                    let personIndex = findIndexInGedcomxPersons(uri, prefixUri, gedcomx);
                    if (personIndex > -1) {
                      node.prefixUri = prefixUri;
                      walkTree(gedcomx.persons[personIndex].id, gedcomx, generationCount, node, personIndex, prefixUri)
                    }
                  } catch (err) {
                    console.error("Error in prefixed source walkTree for URI", uri, err);
                  }
                }
              })
              .catch((err) => {
                console.error("Got an error loading prefixed source", source, err);
              })
          } catch (err) {
            console.error("Error in prefixed source walkTree for URI", uri, err);
          }
        } else {
          console.error("Found no data for prefixed source for URI", uri)
        }
      }
      markFinished(node);
    }

  }

  /**
   * Return the person index matching this ID, or 0 if no exact match found
   * */
  function findIndexInGedcomxPersons(globalUri, prefixUri, gedcomx) {
    // find the person record
    let personIndex = R.findIndex(
      (person) => uriTools.globalUriForId(person.id, prefixUri) === globalUri,
      gedcomx.persons
    );
    if (personIndex == -1) {
      personIndex = 0;
      if (!globalUri.endsWith(gedcomx.persons[personIndex].id)) {
        console.log("Couldn't find", globalUri, "so using person", personIndex, "with ID", gedcomx.persons[personIndex].id)
      }
    }
    return personIndex;
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

  function walkTree(id, gedcomx, generationCount, node, personIndex, gedcomxContext) {

    // Root info
    if (!node.id) {
      node.id = gedcomx.persons[personIndex].id;
    }
    if (!node.name) {
      // timeout is for React-type frameworks where this runs before the HTML has rendered (ugly)
      setTimeout(() => $('.person_name').html(gedcomx.persons[personIndex].display.name+' - <a href="person.html?id='+id+'">View Profile</a>'), 500);

      // will set the tmpNode name below (because it's the same for all nodes)
    }

    // Find current person in json tree (node)
    var tmpNode = find(node, id, gedcomxContext);

    if (!tmpNode.name) {
      tmpNode.name = gedcomx.persons[personIndex].display.name;
    }

    // Set the portrait picture
    if (gedcomx.persons[personIndex].links
        && gedcomx.persons[personIndex].links.portrait
        && gedcomx.persons[personIndex].links.portrait.href) {
      tmpNode.portrait = gedcomx.persons[personIndex].links.portrait.href;
    }

    tmpNode.lifespan = gedcomx.persons[personIndex].display.lifespan;
    tmpNode.birthPlace = gedcomx.persons[personIndex].display.birthPlace;

    let personGlobalId = uriTools.globalUriForId(id, gedcomxContext)

    tmpNode.otherLocations =
      gatherOtherLocations(gedcomx, gedcomx.persons[personIndex].links, personGlobalId);

    // Get Parents
    tmpNode._parents = [];
    // first look for "relationship" links
    if (gedcomx.relationships) {
      let personsParents =
        R.filter(r =>
                 r.type === 'http://gedcomx.org/ParentChild'
                 && r.person1
                 && r.person2
                 && r.person2.resource
                 && uriTools.equal(uriTools.globalUriForId(r.person2.resource, gedcomxContext),
                                   personGlobalId),
                 gedcomx.relationships);
      for (let i = 0; i < personsParents.length; i += 1) {
        let nextId = uriTools.globalUriForResource(personsParents[i].person1.resource, gedcomxContext);
        tmpNode._parents.push({id: nextId, _parents: []});
      }
    }
    // if that doesn't exist, try the display info
    if (tmpNode._parents.length === 0
        && gedcomx.persons[personIndex].display.familiesAsChild) {
      let parents =
        getParentsFromFamiliesAsChild(
          gedcomx.persons[personIndex].display.familiesAsChild[0],
          gedcomx.persons,
          gedcomxContext
        );

      if (parents.father) {
        tmpNode._parents.push({id: parents.father.url, name: parents.father.name});
      }
      if (parents.mother) {
        tmpNode._parents.push({id: parents.mother.url, name: parents.mother.name});
      }
    }

    // Get Children
    tmpNode._children = [];
    // first look for "relationship" links
    if (gedcomx.relationships) {
      let personsChildren =
          R.filter(r =>
                   r.type === 'http://gedcomx.org/ParentChild'
                   && r.person1
                   && r.person2
                   && r.person1.resource
                   && uriTools.equal(uriTools.globalUriForId(r.person1.resource, gedcomxContext),
                                     personGlobalId),
                   gedcomx.relationships);
      for (let i = 0; i < personsChildren.length; i += 1) {
        // This is a way to get the ID of the person if the name isn't available.
        //let name = "(" + new URL(personsChildren[i].person2.resource).pathname.split('/').pop() + ")";
        tmpNode._children.push({id: personsChildren[i].person2.resource});
      }
    }
    // if that didn't work, try the familiesAsParent
    if (tmpNode._children.length === 0
        && gedcomx.persons[personIndex].display
        && gedcomx.persons[personIndex].display.familiesAsParent
        && gedcomx.persons[personIndex].display.familiesAsParent[0].children
        && gedcomx.persons[personIndex].display.familiesAsParent[0].children.length > 0) {
      tmpNode._children =
        getChildrenFromFamiliesAsParent(
          gedcomx.persons[personIndex].display.familiesAsParent[0].children,
          gedcomx.persons,
          gedcomxContext
        );
    }


    // Only proceed with parents for base person up to 4 generations
    if (-1 < generationCount && generationCount < 5) {
      for (let i = 0; i < tmpNode._parents.length; i += 1) {
        getTree2(tmpNode._parents[i].id, generationCount + 1, node);
      }
    }
    // Only proceed with children for base person down 1 generation
    if (-2 < generationCount && generationCount < 1) {
      for (let i = 0; i < tmpNode._children.length; i += 1) {
        getTree2(tmpNode._children[i].id, generationCount - 1, node);
      }
    }
  }

  // Find person by ID in json object tree
  function find(obj, id, uriContext) {
    if (uriTools.globalUriForId(id, uriContext) === uriTools.globalUriForId(obj.id, uriContext)
        || uriTools.globalUriForId(id, uriContext) === obj.fullUri) return obj;
    for (let i = 0; obj._parents && i < obj._parents.length; i ++) {
      var result = find(obj._parents[i], id, uriContext);
      if (result) return result;
    }
    for (let i = 0; obj._children && i < obj._children.length; i ++) {
      var result = find(obj._children[i], id, uriContext);
      if (result) return result;
    }
    return null;
  }

  // Get children: Get their IDs from the display->familiesAsParent object. Get their names from the persons array.
  function getChildrenFromFamiliesAsParent(childResources, persons, uriContext) {
    var children = [];
    // Iterate all children
    for (let j=0; j < childResources.length; j++) {
      // Get name of child: Assume living if person not found in persons array
      for (let i=1; i<persons.length; i++) {
        if (uriTools.globalUriForResource(childResources[j].resource, uriContext)
            === uriTools.globalUriForId(persons[i].id, uriContext)) {
          let id = uriTools.globalUriForResource(childResources[j].resource, uriContext)
          children.push({ id: id, name: persons[i].display.name });
        } else if (uriTools.globalUriForId(childResources[j].resourceId, uriContext)
                   === uriTools.globalUriForId(persons[i].id, uriContext)) {
          let id = uriTools.globalUriForResource(childResources[j].resource, uriContext)
          children.push({ id: id, name: persons[i].display.name });
        }
      }
    }
    return children;
  }

  // Get the parents: Get their IDs from the display->familiesAsChild object. Get their names from the persons array.
  function getParentsFromFamiliesAsChild(family, persons, uriContext) {

    var parents = {father: null, mother: null};

    // Iterate all persons
    for (let i=1; i<persons.length; i++) {
      let uriForNextPerson = uriTools.globalUriForId(persons[i].id, uriContext);

      // Look for first parent
      const parent1ResourceUri = uriTools.globalUriForResource(family.parent1.resource, uriContext);
      // only testing for resourceId because the other fails on FamilySearch and this might be in the same file

      if (uriForNextPerson == parent1ResourceUri
          || (family.parent1
              && family.parent1.resourceId
              && uriForNextPerson
                 == uriTools.globalUriForId(family.parent1.resourceId, uriContext))) {
        // Detect Father/Mother by gender
        if (persons[i].gender.type == "http://gedcomx.org/Male") {
          let id = uriTools.globalUriForId(persons[i].id, uriContext)
          parents.father = {
            id: id,
            name: persons[i].display.name,
            url: uriTools.globalUriForResource(family.parent1.resource, uriContext)
          };
        } else {
          let id = uriTools.globalUriForId(persons[i].id, uriContext)
          parents.mother = {
            id: id,
            name: persons[i].display.name,
            url: uriTools.globalUriForResource(family.parent1.resource, uriContext)
          };
        }
      }

      // Look for second parent
      const parent2ResourceUri = uriTools.globalUriForResource(family.parent2.resource, uriContext);
      // only testing for resourceId because the other fails on FamilySearch and this might be in the same file
      if (uriForNextPerson == parent2ResourceUri
          || (family.parent2
              && family.parent2.resourceId
              && uriForNextPerson
                 == uriTools.globalUriForId(family.parent2.resourceId, uriContext))) {
        // Detect Father/Mother by gender
        if (persons[i].gender.type == "http://gedcomx.org/Male") {
          let id = uriTools.globalUriForId(persons[i].id, uriContext)
          parents.father = {
            id: id,
            name: persons[i].display.name,
            url: uriTools.globalUriForResource(family.parent2.resource, uriContext)
          };
        } else {
          let id = uriTools.globalUriForId(persons[i].id, uriContext)
          parents.mother = {
            id: id,
            name: persons[i].display.name,
            url: uriTools.globalUriForResource(family.parent2.resource, uriContext)
          };
        }
      }

    }
    return parents;
  }

  function gatherOtherLocations(gedcomx, personLinks, personGlobalId) {
    // gather explicit person link
    var personIdResources = []
    if (personLinks
        && personLinks.person
        && personLinks.person.href) {
      let href = uriTools.removeQueryForFS(personLinks.person.href);
      personIdResources = [{
        resource: href,
        description: 'Link to FamilySearch GedcomX',
        format: 'gedcomx'
      }]
    }
    // add other explicit ones (which may include non-gedcomx records)
    let otherIdResources = [];
    if (personLinks
        && personLinks.otherLocations
        && personLinks.otherLocations.resources) {
      otherIdResources = personLinks.otherLocations.resources;
    }
    // now include any other gedcomx IDs already known, possibly from reverse pointers
    let knownIds = MapperBetweenSets.retrieveForIdFrom(personGlobalId, fullTree);
    let knownIdResources = knownIds
        ? R.map(uri => ({resource: uri,
                         description: 'Known (maybe private) GedcomX',
                         format: 'gedcomx'}),
                knownIds)
        : [];
    let allLocations =
      R.unionWith((a,b) => a.resource === b.resource,
                  personIdResources,
                  R.concat(otherIdResources, knownIdResources));
    // now remove one the one we're already on (which can happen for the links.person.href)
    let allLocationsButThis = R.reject(a => a.resource == personGlobalId, allLocations);
    return allLocationsButThis;
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


  exports.setSources = setSources;
  exports.getTree = getTree;
  exports.getQueryParams = getQueryParams;

}(typeof exports === 'undefined' ? this.tree = {} : exports));
