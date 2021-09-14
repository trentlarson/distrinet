
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## [?]

### Added

Projects:
- Allow to show only the biggest 5 project tasks.

### Changed

- Store IRI in .well-known directory (rather than in settings.yml).

Projects:
- Use public forecasting server.



## [0.1.14] - 2021-08-16 - 09691f4057e21fc7f3ef8636ba43e29e57674a8b

### Changed

Histories:
- Use semantic bookmarklet code from inside app (rather than from familyhistories.info).



## [0.1.10] - 2021-07-25 - d87d3034ed92f3da3b56436cc22fdda58800473b

### Fixed

Histories:
- Fixed lack of highlighting semantically tagged items (in packaged releases due to problem accessing static files).



## [0.1.9] - 2021-07-09 - cbd58595a5ae2292c63777d697005d6b3cc1b119

### Added

- In Histories and Genealogy: use a relative path for the default URI



## [0.1.8] - 2021-07-09 - eb8075ead0fdd1a209e146b6f994a98bf6914e76

### Added

Genealogy:
- Add button to copy selected URI to the clipboard.



## [0.1.7] - 2021-07-09 - d78ae5b4706ea7c26b573be351382478f444bfa3

### Added

Histories:
- Search on the history document page.
- Allow for more actions for opening resources.

### Changed

- Change syntax of 'resourceTypes' in settings.



## [0.1.6] - 2021-07-02 - 716c58211a30eac660c397e598c1f3408b38b5cf

### Added

- Add button to create test settings.
- Genealogy:
  - Offer to save new source into settings, both manually and drag-and-drop.
  - Load children of the person in focus.
- Histories:
  - Drag-and-drop a folder into histories to add to settings.

### Fixed

- Genealogy:
  - Do better at loading local data and using IDs correctly.



## [0.1.5] - 2020-11-29 - fa2b33da009f6362b97d4d8b106dbc7cc21d8427

### Fixed

- Histories:
  - Expand directories recursively, more than 1 deep.



## [0.1.3] - 2020-11-27 - 6547ab2802f962eb96f4b04e7163aef3bc82ce70

### Added

- Show helpful errors when settings are formatted badly.
- Histories:
  - Expand directories recursively
  - Make searches case-insensitive
- Projects:
  - Show top 3 or all projects
  - Display subtask & dependent tasks (recursively!)
  - Add comment to the signed message

### Fixed

- Show "searching" spinner immediately.



## [0.1.2] - 2020-10-11 - 1b8712fd01cb49e096710ebc3d2bc537e9fe4523

### Added

- Genealogy: allow entering FS Session ID
- Histories: search through files recursively
- Task Lists: send subtasks & dependents to forecasting; allow focus on a referenced task

### Fixed

- Fix error in settings & genealogy for packaged app (due to 'process' reference)



## [0.1.1] - 2020-09-25 - 9ce0e01da4b7b6cd1649519eff7001fdd33d7bf7

### Added

- Histories: allow typing of search term



## [0.0.2] - 2020-09-21 - 3bb2906775490659f4574457276b345b3022287b

### Added

- Histories: list, load & show on page, and show link markers for semantics
- Task Lists: use priiority & due dates in forecast
- File content cache: load at home page
- Reorganization of documentation and tasks (ie. distrinet tasks)



## [0.0.1] - 2020-09-11 - 221c0c1a784b56200147d84ec1ddc5ea737014ac

### Added

- URI lookup
- Sample applications: ancestry, task lists
