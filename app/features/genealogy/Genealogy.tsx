import electron from 'electron';
import path from 'path';
import process from 'process';
import * as R from 'ramda';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import url from 'url';

// imports for this app
import routes from '../../constants/routes.json';
import { RootState } from '../../store';
import { SourceInternal } from '../distnet/distnetClasses';
import {
  addDragDropListeners,
  buildSource,
  dispatchAddSourceToSettings,
} from '../distnet/distnetSlice';
import { isErrorResult } from '../distnet/settings';
import uriTools from '../distnet/uriTools';
import {
  refreshIdMapperForDispatch,
  setRootUri,
  updateIdMapperForDispatch,
} from './genealogySlice';

require('features/genealogy/js/d3.min.js'); // v 3.5.5
const treeDs = require('features/genealogy/js/tree_ds.js');
const treeFun: TreeOptions = require('features/genealogy/js/tree.js');

interface TreeOptions {
  getQueryParams(): Record<string, string>;
  renderTree(rootUri: string): void;
  setSources(sources: Array<SourceInternal>): void;
}

export default function Genealogy() {
  const fsSessionId: string = useSelector(
    (state: RootState) => state.genealogy.fsSessionId
  );

  // if we see problems with 'remote', maybe fix deprecation: https://www.electronjs.org/docs/api/remote
  if (electron.remote.session) {
    const cookie = {
      url: 'https://api.familysearch.org',
      name: 'fssessionid',
      value: fsSessionId || process.env.FSSESSIONID,
    };
    // if we see problems with 'remote', maybe fix deprecation: https://www.electronjs.org/docs/api/remote
    electron.remote.session.defaultSession.cookies
      .set(cookie)
      .then(() => {
        // success
        // console.log('Set fssessionid cookie:', cookie.value);
        return null;
      })
      .catch((error) => {
        console.error('Error setting fssessionid cookie:', error);
      });
  }

  treeDs.addListener({
    viewportSelector: '.viewer',
    treeUrlPrefix: '#/genealogy',
    svgWidth: 1200,
    svgHeight: 400,
    newWindow: (someUrl: string) => {
      // open a new window
      window.open(someUrl);
    },
    // refreshWindow: Couldn't figure it out.
    // Other things are available if you import 'electron', eg webFrame.context.location.getURL(),
    // but I couldn't get anything to actually set the existingpage to the new URL.
    copyCallback: (text: string) => {
      // eslint-disable-next-line no-new
      new Notification('Copied', {
        body: `Added this to your clipboard: ${text}`,
        silent: true,
      });
    },
  });

  const pageUri = treeFun.getQueryParams().id || '';
  const dispatch = useDispatch();
  if (pageUri) {
    // This causes the following error:
    // "Cannot update a component from inside the function body of a different component."
    // ... but it seems to do everything right.  What's the correct way?
    // Look here for answers: http://stackoverflow.com/questions/36596996/ddg#36657751
    dispatch(setRootUri(pageUri));
  }

  return (
    <div>
      <div data-tid="backButton">
        <Link to={routes.HOME}>
          <i className="fa fa-arrow-left fa-3x" />
        </Link>
      </div>

      <div className="container">
        <h2 className="title">Shared Tree</h2>
        <Link to={routes.GENEALOGY_SETTINGS}>Genealogy Settings</Link>
        <hr className="hr" />
        <GenealogyView tree={treeFun} />
      </div>
    </div>
  );
}

function GenealogyView(options: { tree: TreeOptions }) {
  const dispatch = useDispatch();

  dispatch(refreshIdMapperForDispatch());

  const sources: Array<SourceInternal> = useSelector(
    (state: RootState) => state.distnet.settings.sources
  );
  options.tree.setSources(sources);

  const rootUri: string = useSelector(
    (state: RootState) => state.genealogy.rootUri
  );

  let chosenSource: SourceInternal | undefined;
  if (rootUri) {
    const sourceIds = R.map((s) => s.id, sources);
    const closestUri = uriTools.findClosestUriForGlobalUri(rootUri, sourceIds);
    chosenSource = R.find((s) => s.id === closestUri, sources);
  }

  // Walk tree for ancestors and descendants
  options.tree.renderTree(rootUri);

  const droppableRef = useRef(null);
  const addCallback = (filePath: string) => setRootUri(`file://${filePath}`);
  useEffect(() => {
    const element = droppableRef.current; // all to make typechecking pass
    if (element) {
      addDragDropListeners(element, addCallback, dispatch);
    }
  });

  const genealogySources = R.filter(
    (s) =>
      R.includes(uriTools.globalUriScheme(s.id), ['gedcomx', 'gedcom-indi']),
    sources
  );

  /* eslint-disable no-alert */
  return (
    <div ref={droppableRef}>
      <div>
        <div>
          <ul>
            {genealogySources.map((source) => (
              <li key={source.id}>
                {source.name || '(no name)'}
                &nbsp;
                {/* eslint-disable-next-line jsx-a11y/anchor-has-content,jsx-a11y/anchor-is-valid,jsx-a11y/click-events-have-key-events,jsx-a11y/control-has-associated-label,jsx-a11y/interactive-supports-focus */}
                <a
                  className="fa fa-crosshairs"
                  role="button"
                  title="Load"
                  onClick={() => {
                    dispatch(setRootUri(source.id));
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
        <span>
          Now Viewing:&nbsp;
          {(chosenSource && chosenSource.name) || rootUri}
        </span>
        &nbsp;
        {rootUri ? (
          <span>
            (IRI&nbsp;
            {/* eslint-disable-next-line jsx-a11y/anchor-has-content,jsx-a11y/anchor-is-valid,jsx-a11y/click-events-have-key-events,jsx-a11y/control-has-associated-label,jsx-a11y/interactive-supports-focus */}
            <a
              className="fa fa-copy"
              role="button"
              title={`Copy ${rootUri}`}
              onClick={() => {
                electron.clipboard.writeText(rootUri);
                // eslint-disable-next-line no-new
                new Notification('Copied', {
                  body: `Added this to your clipboard: ${rootUri}`,
                  silent: true,
                });
              }}
            />
            )
          </span>
        ) : (
          <span />
        )}
        <br />
        <ChangeRootUriInput />
        <br />
        <OfferToSaveIfNew rootUri={rootUri} />
      </div>

      <br />
      <span id="error_message" style={{ color: 'orange' }}>
        &nbsp;
      </span>

      <h3 className="person_name">&nbsp;</h3>
      <div className="viewer" />
    </div>
  );
}

enum Visibility {
  visible = 'visible',
  hidden = 'hidden',
}

function getVisibility(isVisible: boolean) {
  return isVisible ? Visibility.visible : Visibility.hidden;
}

function ChangeRootUriInput() {
  const dispatch = useDispatch();

  const [rootUriInputExpanded, setRootUriInputExpanded] = useState(false);
  const [rootUriInput, setRootUriInput] = useState('');

  const inputRef = React.useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  });

  return (
    <span>
      <span style={{ visibility: getVisibility(!rootUriInputExpanded) }}>
        {/* eslint-disable-next-line jsx-a11y/anchor-has-content,jsx-a11y/anchor-is-valid,jsx-a11y/click-events-have-key-events,jsx-a11y/control-has-associated-label,jsx-a11y/interactive-supports-focus */}
        <a
          className="fa fa-edit"
          role="button"
          title="Change"
          onClick={() => {
            setRootUriInput('');
            setRootUriInputExpanded(true);
          }}
        />
      </span>
      <span style={{ visibility: getVisibility(rootUriInputExpanded) }}>
        <br />
        URI &nbsp;
        <input
          type="text"
          size={32}
          ref={inputRef}
          onChange={(event) => {
            setRootUriInput(event.target.value.trim());
          }}
          onKeyUp={(event) => {
            if (event.keyCode === 13) {
              // 13 = enter key
              setRootUriInputExpanded(false);
              if (rootUriInput.length > 0) {
                dispatch(setRootUri(rootUriInput));
              }
            } else if (event.keyCode === 27) {
              // 27 = escape
              setRootUriInputExpanded(false);
            }
          }}
        />
        &nbsp;(hit Enter)
      </span>
    </span>
  );
}

interface SaveOptions {
  rootUri: string;
}

/**
 * If it's local data then check against all known URIs, and
 * if it's not known then prompt user to add it to the settings
 * especially so we can add it to our known IDs and cache the contents.
 */
function OfferToSaveIfNew(options: SaveOptions) {
  const { rootUri } = options;

  let newUrlText = rootUri;
  if (rootUri && uriTools.isGlobalUri(rootUri)) {
    const newUrl = new URL(rootUri);
    newUrl.search = '';
    newUrl.hash = '';
    newUrlText = newUrl.toString();
  }

  const newNamePrefix = newUrlText.startsWith('file:') ? 'Local ' : '';
  const replaced = newUrlText.split(path.sep).slice(-2).join(' ');
  const newName = `${newNamePrefix}${replaced}`;

  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return SourceInputs({
    name: newName,
    rootUri,
    url: newUrlText,
  });
}

interface NewSourceOptions {
  name: string;
  url: string;
  rootUri: string;
}

function SourceInputs(sourceOptions: NewSourceOptions) {
  // Why doesn't it work to set these defaults and I have to set them later in a useEffect?
  // see https://matthewdaly.co.uk/blog/2019/10/27/input-components-with-the-usestate-and-useeffect-hooks-in-react/
  const [settingsName, setSettingsName] = useState(sourceOptions.name);
  const [settingsUrl, setSettingsUrl] = useState(sourceOptions.url);
  const { rootUri } = sourceOptions;

  useEffect(() => {
    setSettingsName(sourceOptions.name);
    setSettingsUrl(sourceOptions.url);
  }, [sourceOptions.name, sourceOptions.url]);

  const dispatch = useDispatch();
  const sources: Array<SourceInternal> = useSelector(
    (state: RootState) => state.distnet.settings.sources
  );

  let addToSettings = <span />;

  if (uriTools.isUriLocalhost(rootUri)) {
    const sourceWithPrefix = R.find(
      (s) => !!s.id && rootUri.startsWith(s.id),
      sources
    );
    let sourceUrlWithPrefix = null;
    if (!sourceWithPrefix) {
      const urls = R.flatten(
        sources.map((s) => (s.urls || []).map(R.prop('url')))
      );
      const allUrls = R.concat(sources.map(R.prop('workUrl')), urls);
      sourceUrlWithPrefix = R.find((u) => rootUri.startsWith(u), allUrls);
    }
    if (!sourceWithPrefix && !sourceUrlWithPrefix) {
      addToSettings = (
        <span>
          This is a new source that you can save:
          <br />
          Description &nbsp;
          <input
            type="text"
            size={100}
            value={settingsName}
            onChange={(event) => {
              setSettingsName(event.target.value);
            }}
          />
          <br />
          Location&nbsp;
          {settingsUrl}
          <br />
          <button
            type="button"
            onClick={() => {
              buildSource(
                settingsName,
                'gedcomx',
                url.fileURLToPath(settingsUrl),
                sources
              )
                .then(async (newSource) => {
                  if (isErrorResult(newSource)) {
                    alert(newSource.error);
                  } else {
                    await dispatch(dispatchAddSourceToSettings(newSource));
                    dispatch(updateIdMapperForDispatch(newSource.id));
                    dispatch(setRootUri(newSource.id));
                    setSettingsName('');
                    setSettingsUrl('');
                  }
                  return null;
                })
                .catch((err) => {
                  console.log('Got an error trying to set that source info.');
                  alert(`Got an error with that source info: ${err.message}`);
                });
            }}
          >
            Add to your permanent settings & search for same IDs.
          </button>
          <br />
          <button
            type="button"
            onClick={() => {
              dispatch(setRootUri(''));
              setSettingsName('');
              setSettingsUrl('');
            }}
          >
            Nevermind! Cancel.
          </button>
        </span>
      );
    }
  }
  return addToSettings;
}
