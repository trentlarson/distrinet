import { Cache, CacheWrapper } from '../distnet/distnetClasses';
import uriTools from './js/uriTools';

const R = require('./js/ramda-0.25.0.min.js');

const SAME_IDENTITIES_KEY = 'SAME_IDENTITIES';

export interface Gedcomx {
  persons: [
    {
      id: string;
      identifiers: Record<string, Array<string>>;
      links: {
        otherLocations: {
          resources: [
            {
              format: string;
              resource: string;
            }
          ];
        };
        person: {
          href: string;
        };
      };
    }
  ];
}

/**
 * Use browser storage to maintain mappings between data sets.
 *
 * We currently allow pointers to records with arbitrary formats.
 */
export default class MapperBetweenSets {
  /**
   * Retrieve the DB of all duplicate IDs.
   *
   * Beware! This is expensive (so use sparingly).
   *
   * @param idKey is an ID for an individual
   * return list of all other IDs correlated with this one
   */
  // eslint-disable-next-line prettier/prettier
  public static retrieveAllIdRecordsFromLocalStorage(): Record<string, Array<string>> {
    const idMapStr = localStorage[SAME_IDENTITIES_KEY];
    return idMapStr ? JSON.parse(idMapStr) : {};
  }

  /**
   * @param idKey is an ID for an individual
   * @param idMap is a record of idKey
   * return list of all other IDs correlated with this one
   */
  public static retrieveForIdFrom(
    idKey: string,
    idMap: Record<string, Array<string>>
  ): Array<string> {
    return idMap[idKey] || [];
  }

  public static getStorageKey() {
    return SAME_IDENTITIES_KEY;
  }

  public static getStorage() {
    return localStorage[SAME_IDENTITIES_KEY];
  }

  public static clear() {
    localStorage.removeItem(SAME_IDENTITIES_KEY);
  }

  /**
   * If there are items in the cache that are are newer, update the mappings in localStorage.
   */
  public static refreshIfNewer(
    previousMillis: number,
    cacheMap: Cache,
    updateMillis: (arg0: number) => void
  ): void {
    const allMillis = R.map(
      R.pipe(R.prop('updatedDate'), (d: string) => new Date(d).valueOf()),
      R.values(cacheMap)
    );
    const maxMillis = R.last(R.sort(R.subtract, allMillis));
    if (previousMillis && previousMillis >= maxMillis) {
      // we're already up-to-date
      return;
    }
    console.log('Map of IDs-spanning-data-sets is out-of-date.  Refreshing...');
    const cache = new CacheWrapper(cacheMap);
    const cacheKeys = cache.getKeys();
    const idMap = this.retrieveAllIdRecordsFromLocalStorage();
    for (let ki = 0; ki < cacheKeys.length; ki += 1) {
      const cacheKey = cacheKeys[ki];
      if (cacheKey.startsWith('gedcomx:')) {
        const content = JSON.parse(cache.valueFor(cacheKey).contents);
        this.findAndSaveSameGedcomxPersons(cacheKey, content, idMap);
      }
    }
    localStorage[SAME_IDENTITIES_KEY] = JSON.stringify(idMap);
    updateMillis(maxMillis);
    console.log('... refreshed.  Map of IDs-spanning-data-sets is up-to-date.');
  }

  public static forceOneRefresh(
    cacheMap: Cache,
    cacheId: string,
    previousMillis: number,
    updateMillis: (arg0: number) => void
  ): void {
    if (cacheId.startsWith('gedcomx:')) {
      const cacheWrap = new CacheWrapper(cacheMap);
      const idMap = this.retrieveAllIdRecordsFromLocalStorage();
      const content = JSON.parse(cacheWrap.valueFor(cacheId).contents);
      this.findAndSaveSameGedcomxPersons(cacheId, content, idMap);
      localStorage[SAME_IDENTITIES_KEY] = JSON.stringify(idMap);

      const allMillis = R.map(
        R.pipe(R.prop('updatedDate'), (d: string) => new Date(d).valueOf()),
        R.values(cacheMap)
      );
      const maxMillis = R.last(R.sort(R.subtract, allMillis));
      console.log(
        'Updated IDs-spanning-data-sets for',
        cacheId,
        ' Updating millis?',
        !previousMillis || previousMillis < maxMillis
      );
      if (!previousMillis || previousMillis < maxMillis) {
        updateMillis(maxMillis);
      }
    }
  }

  /**
   * Search through all the gedcomx persons and add to idMap a correlation between each person and:
   * - any 'otherLocation' links that are 'gedcomx' URLs
   * - any 'person' links
   *
   * Side-effects: updates idMap with matches
   */
  static findAndSaveSameGedcomxPersons(
    repoId: string,
    gedcomx: Gedcomx,
    idMap: Record<string, Array<string>>
  ): void {
    for (let pi = 0; gedcomx.persons && pi < gedcomx.persons.length; pi += 1) {
      const { links, identifiers } = gedcomx.persons[pi];
      if (links && links.otherLocations) {
        for (let li = 0; li < links.otherLocations.resources.length; li += 1) {
          const otherRes = links.otherLocations.resources[li];
          // eslint-disable-next-line prettier/prettier
          const thisId = uriTools.globalUriForId(gedcomx.persons[pi].id, repoId);
          const otherId = uriTools.globalUriForResource(
            otherRes.resource,
            repoId
          );
          this.addPair(thisId, otherId, idMap);
        }
      }
      if (links && links.person) {
        // these are gedcomx data by default
        const thisId = uriTools.globalUriForId(gedcomx.persons[pi].id, repoId);
        const otherId = uriTools.globalUriForResource(
          uriTools.removeQueryForFS(gedcomx.persons[pi].links.person.href),
          repoId
        );
        this.addPair(thisId, otherId, idMap);
      }
      if (identifiers && identifiers['http://gedcomx.org/Persistent']) {
        const persists = identifiers['http://gedcomx.org/Persistent'];
        const thisId = uriTools.globalUriForId(gedcomx.persons[pi].id, repoId);
        for (let pindex = 0; pindex < persists.length; pindex += 1) {
          this.addPair(thisId, persists[pindex], idMap);
        }
      }
    }
  }

  /**
   * Add these two ids one another's mappings in the idMap.
   */
  static addPair(
    id1: string,
    id2: string,
    idMap: Record<string, Array<string>>
  ): void {
    const allSameIds = this.combineAllIdentities([id1, id2], idMap);
    for (let i = 0; i < allSameIds.length; i += 1) {
      const otherIds = R.without([allSameIds[i]], allSameIds);
      idMap[allSameIds[i]] = otherIds;
    }
  }

  /**
   * return Array<string> of initialIds with addition of allIdMappings values with same IDs
   */
  static combineAllIdentities(
    initialIds: Array<string>,
    allIdMappings: Record<string, Array<string>>
  ): Array<string> {
    let collectedIds = R.clone(initialIds);
    let remainingIds = R.clone(initialIds);
    while (remainingIds.length > 0) {
      const additions = allIdMappings[remainingIds[0]] || [];
      const newIds = R.difference(additions, collectedIds);
      collectedIds = R.union(collectedIds, additions);
      remainingIds = R.drop(1, remainingIds);
      remainingIds = R.union(remainingIds, newIds);
    }
    return collectedIds;
  }
}
