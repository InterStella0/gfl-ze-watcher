export const SERVER_WATCH = import.meta.env.VITE_SERVER_WATCH
const API_ROOT = import.meta.env.VITE_API_ROOT
export function URI(endpoint){
    return API_ROOT + endpoint
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
            return response
        })
}