Distributed Genealogy
Keep your own private trees, and point to public trees and browse seamlessly between the two.

To test:

- UI Genealogy Samples:
  - start with `FSSESSIONID=abc123 yarn dev`
  - https://api.familysearch.org/platform/tree/persons/KWHH-HSW
    - Shows Dad.
    - Shows hops to other networks (if cache is loaded).
  - https://raw.githubusercontent.com/misbach/familytree/master/people/KWCJ-RN4/KWCJ-RN4.json
    - Shows images, expands up to 4 levels of expansion, collapses, and clicking network icon recenters on someone. (Profile links don't work yet.)
  - gedcomx:04bf12b0-cecd-11ea-8dda-f73921453c09#KGY4-8D5
    - Shows Will.
  - gedcomx:04bf12b0-cecd-11ea-8dda-f73921453c09#LZK2-LD4
    - Shows Hannah.
  - gedcomx:6d5042a0-d647-11ea-bd04-dbbafdf08067#KWHH-HSW
    - See two parents.
  - gedcomx:b2555240-d918-11ea-b21a-5d9a954c8137#norman
    - See the external links: second goes to two parents.
