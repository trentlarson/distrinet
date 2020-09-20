
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

- Go to the "distnet settings" on the first page and copy settings into the text field, eg. [this one](https://raw.githubusercontent.com/trentlarson/distributed-task-lists/master/sample-sources.yml).
- `yarn`
- `yarn dev`

To test:

- `yarn test-all`
- Run [genealogy tests](app/features/genealogy/README.md).

To package (following https://www.electron.build/auto-update ):

- Edit both package.json versions.
- `yarn package`
- Upload to GitHub and create a release.

When developing:

- Note that it will run some tests before allowing merging to master, eg. `node_modules/.bin/tsc`. Make sure those work because we enforce TypeScript.
- Note that it will also run some pre-commit hooks, eg. `yarn lint`, which can be annoying if you're just trying to commit some temporary work on a branch; if you need to bypass it temporarily, remove the "pre-commit" line from package.json.

To start in a whole new repo, do the following in the same directory where you have dist-task-lists cloned:

- `git clone --depth 1 --single-branch https://github.com/electron-react-boilerplate/electron-react-boilerplate.git your-project-name`
- `cd your-project-name`
- `rm -rf .git`
- Now if you want to save this as the baseline in git, `git init` and `git add .` and `git commit`
- `git apply ../dist-task-lists/patch.diff`
- `cp -r ../dist-task-lists/app/features/distnet app/features`
- ... then continue with above.

To create that patch file:

- `git diff e0aafdd21835b6d0515f5008174d9264c9848e42 app/Routes.tsx app/app.global.css app/components/Home.tsx app/constants/routes.json app/rootReducer.ts package.json yarn.lock > patch.diff`
- ... then look through patch.diff and remove the references to "task" stuff.

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

## Kudos

- [Electron React Boilerplate](https://electron-react-boilerplate.js.org/)
- ... and all the library dependencies in package.json!