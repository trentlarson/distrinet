import { Cache, CacheWrapper } from '../distnet/distnetClasses';
import uriTools from './js/uriTools';

const R = require('./js/ramda-0.25.0.min.js');

const SAME_IDENTITIES_KEY = 'SAME_IDENTITIES';

export interface Gedcomx {
  persons: [
    {
      id: string;
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
  public static retrieveAllIdRecords(): Record<string,Array<string>> {
    const idMapStr = localStorage[SAME_IDENTITIES_KEY];
    return idMapStr ? JSON.parse(idMapStr) : {};
  }

  /**
   * @param idKey is an ID for an individual
   * @param idMap is a record of idKey
   * return list of all other IDs correlated with this one
   */
  public static retrieveForIdFrom(idKey: string, idMap: Record<string,Array<string>>): Array<string> {
    return idMap[idKey] || [];
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
    const keys = cache.getKeys();
    const idMapStr = localStorage[SAME_IDENTITIES_KEY];
    const idMap = idMapStr ? JSON.parse(idMapStr) : {};
    for (let ki = 0; ki < keys.length; ki += 1) {
      const key = keys[ki];
      if (key.startsWith('gedcomx:')) {
        const content = JSON.parse(cache.valueFor(key).contents);
        this.searchForSamePersons(key, content, idMap);
      }
    }
    localStorage[SAME_IDENTITIES_KEY] = JSON.stringify(idMap);
    updateMillis(maxMillis);
    console.log('... refreshed.  Map of IDs-spanning-data-sets is up-to-date.');
  }

  /**
   * Search through all the gedcomx persons and add to localStorage a correlation between each person and:
   * - any 'otherLocation' links that are 'gedcomx' URLs
   * - any 'person' links
   */
  static searchForSamePersons(repoId: string, gedcomx: Gedcomx, idMap: Record<string,Array<string>>): void {
    for (let pi = 0; gedcomx.persons && pi < gedcomx.persons.length; pi += 1) {
      const { links } = gedcomx.persons[pi];
      if (links && links.otherLocations) {
        for (let li = 0; li < links.otherLocations.resources.length; li += 1) {
          const otherRes = links.otherLocations.resources[li];
          if (
            otherRes.format === 'gedcomx' ||
            otherRes.resource.startsWith('gedcomx:')
          ) {
            const thisId = uriTools.globalUriForId(gedcomx.persons[pi].id, repoId);
            const otherId = uriTools.globalUriForResource(
              otherRes.resource,
              repoId
            );
            this.addPair(thisId, otherId, idMap);
          }
        }
      } else if (links && links.person) {
        // these are gedcomx data by default
        const thisId = uriTools.globalUriForId(gedcomx.persons[pi].id, repoId);
        const otherId = uriTools.globalUriForResource(
          uriTools.removeQueryForFS(gedcomx.persons[pi].links.person.href),
          repoId
        );
        this.addPair(thisId, otherId, idMap);
      }
    }
  }

  /**
   * Add these two ids one another's mappings in localStorage.
   */
  static addPair(id1: string, id2: string, idMap: Record<string,Array<IdAndFormat>>): void {
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
