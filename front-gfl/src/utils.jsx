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

export function URIServer(endpoint){
    return URI(`/servers/${SERVER_WATCH}${endpoint}`)
}
export function fetchServerUrl(endpoint, options){
    return fetchUrl(`/servers/${SERVER_WATCH}${endpoint}`, options)
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
export function getFlagUrl(countryCode) {
    return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
};
export function intervalToServer(interval) {
    switch (interval) {
        case "10min": return "min10";
        case "30min": return "min30";
        case "1hour": return "hour1";
        case "6hours": return "hour6";
        case "12hours": return "hour12";
        case "1day": return "day1";
        case "1week": return "week1";
        case "1month": return "month1";
        default:
            console.warn(`Unknown interval: ${interval}`)
            return "min10"
    }
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

export function formatTitle(title){
    return `${title} | Graph LULE`
}

export function getIntervalCallback(selectedInterval){
    return date => {
        switch (selectedInterval) {
            case '10min':
                return date.add(10, 'minute');
            case '30min':
                return date.add(30, 'minute');
            case '1hour':
                return date.add(1, 'hour');
            case '6hours':
                return date.add(6, 'hour');
            case '12hours':
                return date.add(12, 'hour');
            case '1day':
                return date.add(1, 'day');
            case '1week':
                return date.add(1, 'week');
            case '1month':
                return date.add(1, 'month');
            default:
                return date.add(1, 'hour');
        }
    }
}


/**
 * Generate dummy player data for testing
 * @param {number} count - Number of players to generate
 * @returns {Array} Array of player objects
 */
export const generateDummyPlayers = (count) => {
    const players = [];
    const names = ['John', 'Jane', 'Alex', 'Emma', 'Ryan', 'Olivia', 'Michael', 'Sophia', 'William', 'Isabella'];
    const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

    for (let i = 1; i <= count; i++) {
        const nameIdx = Math.floor(Math.random() * names.length);
        const surnameIdx = Math.floor(Math.random() * surnames.length);

        players.push({
            id: `player${i}`,
            name: `${names[nameIdx]} ${surnames[surnameIdx]}`,
            totalPlayTime: Math.floor(Math.random() * 36000), // 0-10 hours in seconds
            sessionCount: Math.floor(Math.random() * 50) + 1 // 1-50 sessions
        });
    }

    return players;
};

/**
 * Format seconds to a readable time format (hours:minutes:seconds)
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export const formatPlayTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours}h ${minutes}m ${remainingSeconds}s`;
};


export const createCountryGeoJson = (latlng) => {
    const { lat, lng } = latlng;
    const offset = 5; // Size appropriate for a country

    return {
        type: 'Feature',
        properties: {
            name: 'United Kingdom',
            code: 'UK',
            flagUrl: 'https://via.placeholder.com/150x100.png?text=UK+Flag'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [
                [
                    [lng - offset, lat - offset],
                    [lng + offset, lat - offset],
                    [lng + offset, lat + offset],
                    [lng - offset, lat + offset],
                    [lng - offset, lat - offset] // Close the polygon
                ]
            ]
        }
    };
};

export const fetchPlayerData = async (latlng) => {
    // Simulate API call with delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In production, replace this with actual API call
    // return fetch(`/api/players?lat=${latlng.lat}&lng=${latlng.lng}`);

    // For now, return dummy data
    return {
        country: createCountryGeoJson(latlng),
        players: generateDummyPlayers(1000)
    };
};