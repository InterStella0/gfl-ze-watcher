const API_ROOT = "/api"

export const ICE_FILE_ENDPOINT = "https://bans.gflclan.com/file/uploads/{}/avatar.webp"

export function URI(endpoint){
    return API_ROOT + endpoint
}

class APIError extends Error{
    constructor(message, status){
        super(message)
        this.message = message
        this.code = status
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

class UserError extends APIError{
    constructor(method, message, status){
        super(`Method ${method}: ${message}`, status)
    }
}

class RateLimited extends APIError{
    constructor(message){
        super(`We're being ratelimited for method ${message}`, 429)
    }
}

export class StillCalculate extends APIError{
    constructor(){
        super(`Data is not ready`, 202)
    }
}
class MaxRateLimit extends APIError{
    constructor(method){
        super(`Stopped attempting to retry ${method}`, 429)
    }
}
const cachedMapMapped = {}
export async function getMapImage(server_id, mapName){
    let result = null
    if (cachedMapMapped[mapName] === undefined) {
        try {
            result = await fetchServerUrl(server_id, `/maps/${mapName}/images`)
            // eslint-disable-next-line no-unused-vars
        } catch (e) {
            result = null
        }
        cachedMapMapped[mapName] = result
    }
    return cachedMapMapped[mapName]
}

export function fetchServerUrl(serverId, endpoint, options){
    return fetchUrl(`/servers/${serverId}${endpoint}`, options)
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchUrl(endpoint, options = {}, maxRetries = 5, backoffBaseMs = 500, maxFailures = 3) {
    if (options?.params) {
        endpoint = endpoint + '?' + new URLSearchParams(options.params).toString();
    }
    const method = URI(endpoint);

    let rateLimitAttempts = 0;
    let failureAttempts = 0;

    while (rateLimitAttempts <= maxRetries && failureAttempts < maxFailures) {
        try {
            const response = await fetch(method, { ...options });

            if (response.status === 429) {
                if (rateLimitAttempts === maxRetries) {
                    throw new MaxRateLimit(method || 'unknown');
                }

                const retryAfter = response.headers.get('Retry-After');
                let delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : backoffBaseMs * (2 ** rateLimitAttempts);
                delay = Math.min(delay, 30000);

                await sleep(delay);
                rateLimitAttempts++;
                continue;
            }

            if (response.status !== 200) {
                const msg = await response.text();
                throw new APIError(msg, response.status);
            }

            const json = await response.json();

            if (json.code === 202){
                throw new StillCalculate()
            }

            if (json.msg === "OK") {
                return json.data;
            } else {
                throw new UserError(method, json.msg, json.code);
            }

        } catch (err) {
            if (err instanceof RateLimited) {
                const retry = backoffBaseMs * (2 ** rateLimitAttempts);
                await sleep(retry);
                rateLimitAttempts++;
                continue;
            }
            if (err instanceof UserError){
                throw err;
            }

            failureAttempts++;
            if (failureAttempts < maxFailures) {
                const retry = backoffBaseMs * (2 ** failureAttempts);
                await sleep(retry);
                continue;
            }

            throw err;
        }
    }

    throw new MaxRateLimit(method || 'unknown');
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
    return `${title} | ZE Graph`
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

