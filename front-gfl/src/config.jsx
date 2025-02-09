export const SERVER_WATCH = import.meta.env.VITE_SERVER_WATCH
const API_ROOT = import.meta.env.VITE_API_ROOT
export function URI(endpoint){
    return API_ROOT + endpoint
}

class APIError extends Error{
    constructor(message, status){
        this.message = message
        this.code = status
    }
}

export function fetchUrl(endpoint, { params }){
    if (params)
        endpoint = endpoint + '?' + new URLSearchParams(params).toString()
    return fetch(URI(endpoint))
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