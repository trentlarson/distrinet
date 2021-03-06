
# Distrinet

Code for [Distrinet](https://trentlarson.gitlab.io/distrinet-doc)

Here's what this does:

- Given a URI, provide the content (and/or a URL).
  - This is currently code inside the app; we could also make this a local HTTP server that gives up the content (and/or a URL).

This also currently contains these sample applications:

- [Distributed Task Lists](app/features/task-lists/README.md)
- [Distributed Histories](app/features/histories/README.md)
- [Distributed Genealogy](app/features/genealogy/README.md)




## Plans

See [tasks.yml](tasks.yml)




## Development


To run:

- `yarn`
- `yarn dev`


To add the tasks for this project:

- Go to the "distnet settings" and click 'Add Distrinet Project Source' at the bottom.


To experiment with test data:

- Go to the "distnet settings" and click 'Use Test Settings' at the bottom.


To run tests:

- `yarn test-all`
- Run [genealogy tests](app/features/genealogy/README.md).


To package (following https://www.electron.build/auto-update ):

- Edit both package.json versions (in / and /app).
- Add to CHANGELOG.md
- `git push` and let GitHub build all packages before pushing anything new.
  - Manually: `yarn package`, create a GitHub release, and upload package(s) to it.
- Add the commit hash to CHANGELOG.md.  Bump the versions and add "-beta".


When developing:

- Continuously test with 'yarn test-all', which will run tests & type checks & lint checks.
- To start with new data:
  - Go to "distrinet settings" and click on "Use Test Settings" and save that.
  - Go to "genealogy" and "Genealogy Settings" and click the "clear" button.
  - If you've made code changes, go to the main screen and refresh (eg. CTRL-R).  The auto-load works pretty well but not always well.


#### Tooling

Current [sample app](https://github.com/trentlarson/distrinet) is built on the Electron framework.

- Rejected frameworks:
  - Node & React Native
    - good because we use it for other projects
    - unable to get it working for macos
  - Flutter & Dart - immature, deskop for Mac in alpha
    - final nail: my exception doesn't show the main.dart line (eg. when the config.yml file doesn't exist)
    - Flutter & Kotlin?
  - Node & Electron - doesn't target mobile
  - Ionic - requires an account
  - Local server via browser - not designed for mobile (most tools just serve files or PHP)

- For delivery/connectivity
  - [Syncthing](syncthing.net), [Resilio](resilio.com), [BitTorrent](bittorrent.com), [Dropbox](dropbox.com), [Google Drive](www.google.com/drive), [Box](box.com), [OneDrive](onedrive.live.com), [Lightstreams](https://docs.lightstreams.network/products/smart-vault/getting-started/share-private-file-p2p)
  - [remoteStorage](https://remotestorage.io/)
  - Distributed protocols: [Matrix](https://matrix.org/), [Yjs](https://github.com/yjs/yjs) & CRDTs, [dat](https://dat.foundation) & [Hypercore](https://hypercore-protocol.org/), file sharing apps (see a [decision tree -- click on Sharing --](http://familyhistories.info/sharing) and a [matrix of features](https://docs.google.com/document/d/1pi-9aM_N_qhAx4veRii-glb9_UR-vWaHC4ZDLUEI0rY/edit))
  - Standard HTTP APIs (public or private), eg. REST endpoints and Git hosting providers.
  - [Skynet](https://siasky.net/) for decentralized storage with updates and built-in payment
  - [Solid](https://solidproject.org) pods
  - [cephora](https://github.com/HR/ciphora) secure messaging
  - Briar?

- For storage:
  - file system
  - authenticated server
  - encrypted data
  - ZKPs

- For apps:
  - [git](git-scm.com) excels at tracking the histories of file changes, including the actors and the differences.
  - [Danube Tech](https://danubetech.com/) works on foundational pieces of self-sovereign infrastructure with DID resolvers
  - [Solid](https://solidproject.org) aims at personal pods, and includes many [tools](https://solidproject.org/for-developers/apps/tools).
  - [Picos](https://www.windley.com/archives/2015/05/picos_persistent_compute_objects.shtml) (still being developed at BYU)
  - [unhosted](https://unhosted.org/tools/)
  - not a fit
    - [noBackend](http://nobackend.org/) and [Hoodie](http://hood.ie) built on the [standard]() are nice for front-end apps but I don't think they fit the model of data-first.  Looking deeper, you'll find [the Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) and [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) standards.
    - [sockethub](http://sockethub.org/) is good for rapid messaging, less useful for shared data
  - Identity / Verified Credentials
    - uPort.me (on Ethereum)
    - connect.me (on Sovrin)
    - MetaMask.io (on Ethereum)
    - AralaPrism.io (on Cardano, not open-source)




## Design

Types of URI -> URL relationships:

- For "sources.urls":
  - The first URL is preferred.  If that's a remote URL:
    - You might have a local copy (eg. a git clone), and that "file:///" URL would be what to put as the second URL.
    - If there is no local copy, a copy will be downloaded and stored by this app.
  - Any URLs after the first are typically writable but not read (except when disconnected or to detect conflicts).
  - Future write methods could include:
    - Direct to file (typically sync'd through external tool)
      - OneDrive, Syncthing, Google Drive
    - Direct to git
    - git via request
      - This may need a pointer to my own copy repro.
    - Direct to Notion
    - Direct to Facebook
    - Sync would be dynamically updating. (Maybe both source & sink?)
      - Yjs & CRDTs
  - Future toggle settings on sources could include:
    - always load into memory (and watch for changes)
    - keep a local history




## Other

To create your own URI, I recommend you use a scheme with your domain or email and the year (if you had it at the beginning of the year), such as "tag:my-email@protonmail.com,2020:stuff-for-home" following the [TagURI](http://taguri.org) [standard](http://www.faqs.org/rfcs/rfc4151.html).  It's an easy way to get started with unique IDs.




## Kudos

- [Electron React Boilerplate](https://electron-react-boilerplate.js.org/)
- ... and all the library dependencies in [package.json](./package.json)!