# Distributed Genealogy

Keep your own private trees, and point to public trees and browse seamlessly between the two.

The goal, of course, is to read many genealogy formats, but the first examples are GEDCOM X.

- Simply add GEDCOM X files with a URI prefixed with "gedcomx:" into the "distrinet settings", then you'll go to the "genealogy" part of this app and enter URIs and see people.

- Note that this work may extend the GEDCOM X spec: local data will often point to the same person with other IDs in remote data sets.  In the current version we use "otherLocations" inside "link" (but that format looks wrong and there's a task logged to change it id:other-locations).

## User Stories

- I can show my own ancestry, where it links to public data, where my sister and I share data, and where there are holes in my view (eg. her husband's family) which she can see.

## Design

- Add a property "otherLocations" inside "persons[].links" any time you want to link an existing person to the same person in another data set.  It should be a URI.
- For IDs within the same resource: use fragments (eg. #ABCD-EFG)
  Using fragments since that's [used by GEDCOM X as well](https://github.com/FamilySearch/gedcomx/blob/master/specifications/json-format-specification.md#fragment-ids).

## Development

To test:

- UI Genealogy Samples:
  - Get `fssessionid` and start with `FSSESSIONID=... yarn dev` or fill in on page.
  - file:///Users/tlarson/dev/home/distrinet/test/features/genealogy/sample-gedcomx.json#thomas-iii
    - Shows Thomas, and external link goes to FamilySearch with image.
  - https://api.familysearch.org/platform/tree/persons/KWHH-HSW
    - Shows Dad.
    - Shows hops to other networks (if cache is loaded).
  - https://raw.githubusercontent.com/misbach/familytree/master/people/KWCJ-RN4/KWCJ-RN4.json
    - Shows Almon with images, expands up to 4 levels of expansion, collapses, and clicking network icon recenters on someone. (Profile links don't work yet.)
  - gedcomx:68bcddaa-3fef-4830-af04-aa8a88781a17#KGY4-8D5
    - Shows Will.
  - gedcomx:68bcddaa-3fef-4830-af04-aa8a88781a17#LZK2-LD4
    - Shows Hannah.
  - gedcomx:trentlarson.com,2020:Norman-Larson-from-FamilySearch#KWHH-HSW
    - See two parents.
  - gedcomx:trentlarson.com,2020:Norman-Sharon-Larson-for-kids#norman
    - See 3 external links: api has pics, copy from Matt has 2 parents, ancestors opens window

## Kudos

- FamilySearch.org and GEDCOMX.org and [the developer specs](https://www.familysearch.org/developers/docs/api/gx_json).
- [Matt Misbach's Decentralized Distributed Genealogical Tree graphics & parsing](https://github.com/DecentralizedGenealogy/webclient)
- [Justin York's D3 Pedigree Examples](https://github.com/justincy/d3-pedigree-examples)
- [arrow image](https://svgsilh.com/9e9e9e/image/29170.html)
