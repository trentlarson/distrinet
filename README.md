
# Distributed Task Management

See [distributed-task-lists](https://github.com/trentlarson/distributed-task-lists)

Here are the purposes of this service:

- Given a URI, provide the content (and/or a URL).
  - This is currently code inside the app; we could also make this a local HTTP server that gives up the content (and/or a URL).
  - This may eventually be replaced by DID Resolvers.
- When offline, provide a cached copy of that content.
- Ease the management of personal data, including backups.
- Give an easy-to-use interface to sharing & vetting content via file syncing, git, Matrix, Keybase.io, maybe even Yjs & CRDTs, etc. (This is an ever-expanding set of features to grow the use of diffs, verifiable data, and permissions management.)
  - Much of this will work it's way into wallets or agents or git as the project grows and/or the tools mature.
  - Types of edits:
    - file
      - directly (potentially followed by a publication)
      - into my copy with a diff
    - git
      - directly into repo
      - into a repo with a merge request (or with a `git diff` patch someday)
    - CRDTs: directly
    - DB
      - shared via file sync (eg. SQLite)
      - extract a patch (either via diff or changeset-since-version)

This also contains these sample applications:

- [Distributed Genealogy](app/features/genealogy/README.md)

- [Distributed Family Histories](app/features/histories/README.md)

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

- Note that it will run some tests before allowing merging to master, eg. `node_modules/bin/tsc`. Make sure those work because we enforce TypeScript.
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

Design

- Options for IDs within resource: /person/ABCD-EFG or /person?id=ABCD-EFG or #ABCD-EFG
  Let's use fragments, since that's [used by GedcomX as well](https://github.com/FamilySearch/gedcomx/blob/master/specifications/json-format-specification.md#fragment-ids).

Types of URI -> URL relationships:

- For "sources", each URL is attempted in order.
  - If any URL after the first is not writable, that's a different source you might be monitoring just to review changes (which you might not import).
- 0 or more "sinks", though write method could be any:
  - Direct to file (typically sync'd through external tool"
    - OneDrive, Syncthing, Google Drive
  - Direct to git
  - git via request
    - This may need a pointer to my own copy repro.
  - Direct to Notion
  - Direct to Facebook
- Sync would be dynamically updating. (Maybe both source & sink?)
  - Yjs & CRDTs
- toggle settings on sources
  - always load into memory (and watch for changes)
  - keep a local history

Thanks to:

- [Electron React Boilerplate](https://electron-react-boilerplate.js.org/)
- [Matt Misbach's Decentralized Distributed Genealogical Tree graphics & parsing](https://github.com/DecentralizedGenealogy/webclient)
- [Justin York's D3 Pedigree Examples](https://github.com/justincy/d3-pedigree-examples)
- [arrow image](https://svgsilh.com/9e9e9e/image/29170.html)




Here's how this project was initially created:

________________________________________________________________________________
<img src="internals/img/erb-banner.png" width="100%" />

<br>

<p>
  Electron React Boilerplate uses <a href="https://electron.atom.io/">Electron</a>, <a href="https://facebook.github.io/react/">React</a>, <a href="https://github.com/reactjs/redux">Redux</a>, <a href="https://github.com/reactjs/react-router">React Router</a>, <a href="https://webpack.github.io/docs/">Webpack</a> and <a href="https://github.com/gaearon/react-hot-loader">React Hot Loader</a> for rapid application development (HMR).
</p>

<br>

<div align="center">
  <a href="https://facebook.github.io/react/"><img src="./internals/img/react-padded-90.png" /></a>
  <a href="https://webpack.github.io/"><img src="./internals/img/webpack-padded-90.png" /></a>
  <a href="https://redux.js.org/"><img src="./internals/img/redux-padded-90.png" /></a>
  <a href="https://github.com/ReactTraining/react-router"><img src="./internals/img/react-router-padded-90.png" /></a>
  <a href="https://eslint.org/"><img src="./internals/img/eslint-padded-90.png" /></a>
  <a href="https://facebook.github.io/jest/"><img src="./internals/img/jest-padded-90.png" /></a>
  <a href="https://yarnpkg.com/"><img src="./internals/img/yarn-padded-90.png" /></a>
</div>

<hr />
<br />

<div align="center">

[![Build Status][github-actions-status]](github-actions-status)
[![Dependency Status][david-image]][david-url]
[![DevDependency Status][david-dev-image]][david-dev-url]
[![Github Tag][github-tag-image]][github-tag-url]

[![Join the community on Spectrum](https://withspectrum.github.io/badge/badge.svg)](https://spectrum.chat/electron-react-blpt)
[![OpenCollective](https://opencollective.com/electron-react-boilerplate/backers/badge.svg)](#backers)
[![OpenCollective](https://opencollective.com/electron-react-boilerplate/sponsors/badge.svg)](#sponsors)
[![Good first issues open][good-first-issue-image]][good-first-issue-url]
[![StackOverflow][stackoverflow-img]][stackoverflow-url]

</div>

## Install

- **If you have installation or compilation issues with this project, please see [our debugging guide](https://github.com/electron-react-boilerplate/electron-react-boilerplate/issues/400)**

First, clone the repo via git and install dependencies:

```bash
git clone --depth 1 --single-branch https://github.com/electron-react-boilerplate/electron-react-boilerplate.git your-project-name
cd your-project-name
yarn
```

## Starting Development

Start the app in the `dev` environment. This starts the renderer process in [**hot-module-replacement**](https://webpack.js.org/guides/hmr-react/) mode and starts a webpack dev server that sends hot updates to the renderer process:

```bash
yarn dev
```

## Packaging for Production

To package apps for the local platform:

```bash
yarn package
```

## Docs

See our [docs and guides here](https://electron-react-boilerplate.js.org/docs/installation)

## Donations

**Donations will ensure the following:**

- 🔨 Long term maintenance of the project
- 🛣 Progress on the [roadmap](https://electron-react-boilerplate.js.org/docs/roadmap)
- 🐛 Quick responses to bug reports and help requests

## Backers

Support us with a monthly donation and help us continue our activities. [[Become a backer](https://opencollective.com/electron-react-boilerplate#backer)]

<a href="https://opencollective.com/electron-react-boilerplate/backer/0/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/0/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/1/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/1/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/2/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/2/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/3/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/3/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/4/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/4/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/5/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/5/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/6/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/6/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/7/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/7/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/8/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/8/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/9/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/9/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/10/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/10/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/11/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/11/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/12/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/12/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/13/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/13/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/14/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/14/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/15/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/15/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/16/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/16/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/17/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/17/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/18/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/18/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/19/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/19/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/20/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/20/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/21/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/21/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/22/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/22/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/23/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/23/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/24/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/24/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/25/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/25/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/26/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/26/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/27/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/27/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/28/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/28/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/backer/29/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/backer/29/avatar.svg"></a>

## Sponsors

Become a sponsor and get your logo on our README on Github with a link to your site. [[Become a sponsor](https://opencollective.com/electron-react-boilerplate-594#sponsor)]

<a href="https://opencollective.com/electron-react-boilerplate/sponsor/0/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/1/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/2/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/3/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/4/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/5/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/6/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/7/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/8/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/9/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/9/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/10/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/10/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/11/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/11/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/12/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/12/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/13/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/13/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/14/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/14/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/15/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/15/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/16/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/16/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/17/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/17/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/18/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/18/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/19/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/19/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/20/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/20/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/21/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/21/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/22/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/22/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/23/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/23/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/24/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/24/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/25/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/25/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/26/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/26/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/27/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/27/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/28/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/28/avatar.svg"></a>
<a href="https://opencollective.com/electron-react-boilerplate/sponsor/29/website" target="_blank"><img src="https://opencollective.com/electron-react-boilerplate/sponsor/29/avatar.svg"></a>

## Maintainers

- [Amila Welihinda](https://github.com/amilajack)
- [C. T. Lin](https://github.com/chentsulin)
- [Jhen-Jie Hong](https://github.com/jhen0409)

## License

MIT © [Electron React Boilerplate](https://github.com/electron-react-boilerplate)

[github-actions-status]: https://github.com/electron-react-boilerplate/electron-react-boilerplate/workflows/Test/badge.svg
[github-tag-image]: https://img.shields.io/github/tag/electron-react-boilerplate/electron-react-boilerplate.svg?label=version
[github-tag-url]: https://github.com/electron-react-boilerplate/electron-react-boilerplate/releases/latest
[stackoverflow-img]: https://img.shields.io/badge/stackoverflow-electron_react_boilerplate-blue.svg
[stackoverflow-url]: https://stackoverflow.com/questions/tagged/electron-react-boilerplate
[david-image]: https://img.shields.io/david/electron-react-boilerplate/electron-react-boilerplate.svg
[david-url]: https://david-dm.org/electron-react-boilerplate/electron-react-boilerplate
[david-dev-image]: https://img.shields.io/david/dev/electron-react-boilerplate/electron-react-boilerplate.svg?label=devDependencies
[david-dev-url]: https://david-dm.org/electron-react-boilerplate/electron-react-boilerplate?type=dev
[good-first-issue-image]: https://img.shields.io/github/issues/electron-react-boilerplate/electron-react-boilerplate/good%20first%20issue.svg?label=good%20first%20issues
[good-first-issue-url]: https://github.com/electron-react-boilerplate/electron-react-boilerplate/issues?q=is%3Aopen+is%3Aissue+label%3A"good+first+issue"
