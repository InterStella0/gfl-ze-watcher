import levenshtein from "fast-levenshtein";

export const SERVER_WATCH = import.meta.env.VITE_SERVER_WATCH
const API_ROOT = import.meta.env.VITE_API_ROOT

export const ICE_FILE_ENDPOINT = "https://bans.gflclan.com/file/uploads/{}/avatar.webp"

export function URI(endpoint){
    return API_ROOT + endpoint
}

class APIError extends Error{
    constructor(message, status){
        super()
        this.message = message
        this.code = status
    }
}


let mapCache = null;
let mapCachePromise = null;
function getMapList() {
    if (mapCache)
        return mapCache

    if (!mapCachePromise) {
        mapCachePromise = fetchUrl('/map_list_images')
            .then(payload => {
                mapCache = payload
                mapCachePromise = null
                return mapCache
            })
            .catch(err => {
                mapCachePromise = null
                throw err
            });
    }

    return mapCachePromise
}
export async function getMapImage(mapName){
    const mapLists = await getMapList()
    return mapLists
        .map(map => ({
            map,
            distance: levenshtein.get(mapName, map.map_name)
        }))
        .sort((a, b) => a.distance - b.distance)[0]?.map;
}

export function fetchUrl(endpoint, options){
    if (options?.params)
        endpoint = endpoint + '?' + new URLSearchParams(options.params).toString()
    return fetch(URI(endpoint), { ...options })
        .then(response => response.json())
        .then(response => {
            if (response.msg === "OK"){
                return response.data
            }
            throw new APIError(response.msg, response.code)
        })
}

export function debounce(func, wait, immediate) {
    let timeout;
    const debounced = function() {
      const context = this;
      const args = arguments;
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  
    debounced.cancel = () => {
      clearTimeout(timeout);
      timeout = null;
    };
  
    return debounced;
  }


export function secondsToHours(seconds){
    return (seconds / 3600).toFixed(2)
}
export function secondsToMins(seconds){
    return (seconds / 60).toFixed(2)
}
export const InfractionFlags = Object.freeze({
    // Issued by system
    SYSTEM: 1n << 0n,

    // Scope
    ALL_SERVERS: 1n << 1n,
    COMMUNITY: 1n << 2n,
    // Otherwise: Only Origin Server

    // Where it was issued
    VPN: 1n << 4n,
    WEB: 1n << 5n,

    // Has been removed
    INFRACTION_REMOVED: 1n << 6n,

    // Restriction
    VOICE: 1n << 7n,
    TEXT: 1n << 8n,
    BAN: 1n << 9n,
    CALL_ADMIN: 1n << 10n,
    ADMIN_CHAT: 1n << 11n,
    ITEM_BLOCK: 1n << 14n,
    AUTO_TIER: 1n << 16n,

    // Time
    PERMANENT: 1n << 3n,
    SESSION: 1n << 12n,
    ONLINE_DECREMENT: 1n << 13n,
});
export function addOrdinalSuffix(num) {
    let suffix = "th";
    if (num % 100 < 11 || num % 100 > 13) {
        switch (num % 10) {
            case 1: suffix = "st"; break;
            case 2: suffix = "nd"; break;
            case 3: suffix = "rd"; break;
        }
    }
    return num + suffix;
}

export class InfractionInt {
    constructor(value) {
        this.value = BigInt(value);
    }

    hasFlag(flag) {
        return (this.value & flag) === flag;
    }
    getAllRestrictedFlags(){
        const restrictFlags = [
            InfractionFlags.VOICE,
            InfractionFlags.TEXT,
            InfractionFlags.BAN,
            InfractionFlags.CALL_ADMIN,
            InfractionFlags.ADMIN_CHAT,
            InfractionFlags.ITEM_BLOCK,
            InfractionFlags.AUTO_TIER
        ];
        return Object.entries(InfractionFlags)
            .filter(([_, flag]) => this.hasFlag(flag) && restrictFlags.includes(flag))
            .map(([name]) => name);
    }
    getAllFlags() {
        return Object.entries(InfractionFlags)
            .filter(([_, flag]) => this.hasFlag(flag))
            .map(([name]) => name);
    }
}
export function simpleRandom(min, max){
    return Math.random() * (max - min) + min;
}
export function formatFlagName(flagName) {
    return flagName.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}