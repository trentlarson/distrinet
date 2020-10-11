
# Distrinet

Code for [Distrinet](https://trentlarson.gitlab.io/distrinet-doc)

Here's what I do:

- Given a URI, provide the content (and/or a URL).
  - This is currently code inside the app; we could also make this a local HTTP server that gives up the content (and/or a URL).
  - This may eventually be replaced by DID Resolvers.

I also currently contain these sample applications:

- [Distributed Task Lists](app/features/task-lists/README.md)
- [Distributed Histories](app/features/histories/README.md)
- [Distributed Genealogy](app/features/genealogy/README.md)

## Plans

See [tasks.yml](tasks.yml)

## Development

To run:

- Go to the "distnet settings" on the first page and copy settings into the text field, eg. [sample-sources.yml](resources/sample-sources.yml)
- `yarn`
- `yarn dev`

To test:

- `yarn test-all`
- Run [genealogy tests](app/features/genealogy/README.md).

To package (following https://www.electron.build/auto-update ):

- Edit both package.json versions (in / and /app).
- Add to CHANGELOG.md
- `yarn package`
- Upload to GitHub and create a release.

When developing:

- Note that it will run some tests before allowing merging to master, eg. `node_modules/.bin/tsc`. Make sure those work because we enforce TypeScript.
- Note that it will also run some pre-commit hooks, eg. `yarn lint`, which can be annoying if you're just trying to commit some temporary work on a branch; if you need to bypass it temporarily, remove the "pre-commit" line from package.json.

To start in a whole new repo, do the following in the same directory where you have distrinet cloned:

- `git clone --depth 1 --single-branch https://github.com/electron-react-boilerplate/electron-react-boilerplate.git your-project-name`
- `cd your-project-name`
- `rm -rf .git`
- Now if you want to save this as the baseline in git, `git init` and `git add .` and `git commit`
- `git apply ../distrinet/patch.diff`
- `cp -r ../distrinet/app/features/distnet app/features`
- ... then continue with above.

To create that patch file:

- `git diff e0aafdd21835b6d0515f5008174d9264c9848e42 app/Routes.tsx app/app.global.css app/components/Home.tsx app/constants/routes.json app/rootReducer.ts package.json yarn.lock > patch.diff`
- ... then look through patch.diff and remove the references to "task" stuff.

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

- For "sources.urLs":
  - The first URL is preferred.  If that's a remote URL:
    - You might have a local copy (eg. a git clone), and that "file:///" URL would be what to put as the second URL.
    - If there is no local copy, a copy will be downloaded and stored by this app..
  - Any URLs after the first are typically writable and not read (except to detect conflicts).
  - Future write methods could include:
    - Direct to file (typically sync'd through external tool"
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