(function(exports){

var $ = require("./jquery-2.2.4.min.js");


  function walkTree(url, rsp, node) {

    // Root name info
		if (node.name == null) {
			node.name = person.persons[0].display.name;
			$('.person_name').html(person.persons[0].display.name+' - <a href="person.html?id='+url+'">View Profile</a>');
		}


    // Get Parents
    if (person.persons[0].display.familiesAsChild) {
	    var parents = getParents(person.persons[0].display.familiesAsChild[0], person.persons);

			// Find current person in json tree (node)
			var tmpNode = find(node, url);
	    tmpNode._parents.push({id: parents.father.url, name: parents.father.name, _parents: []});
	    tmpNode._parents.push({id: parents.mother.url, name: parents.mother.name, _parents: []});
			tmpNode.lifespan = person.persons[0].display.lifespan;
			tmpNode.birthPlace = person.persons[0].display.birthPlace;
    }


		// Get children of root person only
		// TODO Get multiple generations of descendants
		if (generationCount == 0 && person.persons[0].display.familiesAsParent[0].children.length > 0) {
			node._children = getChildren(person.persons[0].display.familiesAsParent[0].children, person.persons);
		}

    // Stop after 4 generations
    if (generationCount < 6) {
	    getTree(parents.father.url, node);
	    getTree(parents.mother.url, node);
    }
  }


// Walk tree
var generationCount = 0;
var asyncCount = 0;
function getTree(url = params.id, node) {
	generationCount++;
	asyncCount ++;

	$.get(url)
  .done(function(rsp) {
    person = JSON.parse(rsp);
    walkTree(url, rsp, node)
  }).always(function() {
    // Detect when finished
    if (--asyncCount == 0 ) {
    	treeObj = node;
    	console.log(treeObj);
    	// Notify D3 to render the tree
    	document.dispatchEvent(new Event('treeComplete'));
    }
  });
}

// Find person by ID in json object tree
function find(obj, id) {
  if (obj.id === id) return obj;
  for (var i = 0; i < obj._parents.length; i ++) {
    var result = find(obj._parents[i], id);
    if (result) return result;
  }
  return null;
}

// Get children: Get their IDs from the display->familiesAsParent object. Get their names from the persons array.
function getChildren(family, persons) {
	var children = [];
	// Iterate all children
	for (var j=0; j < family.length; j++) {
	  // Get name of child: Assume living if person not found in persons array
		for (var i=1; i<persons.length; i++) {
			if (family[j].resourceId == persons[i].id) {
				var name = (persons[i].display.name);
			  children.push({ id: persons[0].display.familiesAsParent[0].children[j].resource, name: name });
			}
		}
	}
	return children;
}

// Get the parents: Get their IDs from the display->familiesAsChild object. Get their names from the persons array.
function getParents(family, persons) {
	var parent1 = family.parent1.resourceId;
	var parent2 = family.parent2.resourceId;
	var parents = {father: null, mother: null};
	// Iterate all persons
	for (var i=1; i<persons.length; i++) {

		// Look for first parent
		if (persons[i].id == parent1) {
			// Detect Father/Mother by gender
			if (persons[i].gender.type == "http://gedcomx.org/Male") {
				parents.father = {id: persons[i].id, name: persons[i].display.name, url: family.parent1.resource};
			} else {
				parents.mother = {id: persons[i].id, name: persons[i].display.name, url: family.parent1.resource};
			}
		}

		// Look for second parent
		if (persons[i].id == parent2) {
			// Detect Father/Mother by gender
			if (persons[i].gender.type == "http://gedcomx.org/Male") {
				parents.father = {id: persons[i].id, name: persons[i].display.name, url: family.parent2.resource};
			} else {
				parents.mother = {id: persons[i].id, name: persons[i].display.name, url: family.parent2.resource};
			}
		}

	}
	return parents;
}

exports.getTree = getTree;

}(typeof exports === 'undefined' ? this.tree = {} : exports));