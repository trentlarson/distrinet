# Distributed Genealogy

Keep your own private trees, and point to public trees and browse seamlessly between the two.

To test:

- UI Genealogy Samples:
  - Get `fssessionid` and start with `FSSESSIONID=... yarn dev`
  - https://api.familysearch.org/platform/tree/persons/KWHH-HSW
    - Shows Dad.
    - Shows hops to other networks (if cache is loaded).
  - https://raw.githubusercontent.com/misbach/familytree/master/people/KWCJ-RN4/KWCJ-RN4.json
    - Shows Almon with images, expands up to 4 levels of expansion, collapses, and clicking network icon recenters on someone. (Profile links don't work yet.)
  - gedcomx:68bcddaa-3fef-4830-af04-aa8a88781a17#KGY4-8D5
    - Shows Will.
  - gedcomx:68bcddaa-3fef-4830-af04-aa8a88781a17#LZK2-LD4
    - Shows Hannah.
  - gedcomx:15d50f2a-2250-4f88-b064-a160685f9281#KWHH-HSW
    - See two parents.
  - gedcomx:1bd0e1c4-aa66-4d12-93ff-0d8c4b13d252#norman
    - See 3 external links: api has pics, 15d has 2 parents, ancestors opens window
