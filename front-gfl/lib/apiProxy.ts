import {NextRequest, NextResponse} from "next/server";
import { auth } from "../auth";
import { BACKEND_DOMAIN } from "utils/generalUtils";

export async function proxyToBackend(
    endpoint: string,
    req?: Request
) {
    const session = await auth();

    const backendUrl = new URL(BACKEND_DOMAIN + endpoint);

    if (req) {
        const url = new URL(req.url);
        url.searchParams.forEach((value, key) => {
            backendUrl.searchParams.set(key, value);
        });
    }

    const headers: HeadersInit = { "Content-Type": "application/json" };
    // @ts-ignore
    if (session?.backendJwt) {
        // @ts-ignore
        headers["Authorization"] = `Bearer ${session.backendJwt}`;
    }

    try {
        const backendResponse = await fetch(backendUrl.toString(), {
            headers,
        });
        if (backendResponse.ok){
            const data = await backendResponse.json();
            return NextResponse.json(data, { status: backendResponse.status });
        }else{
            const data = await backendResponse.text();
            return NextResponse.json(data, { status: backendResponse.status });
        }
    } catch (error) {
        console.error("Error calling backend endpoint:", error);
        return NextResponse.json(
            { msg: "Internal server error", code: 500 },
            { status: 500 }
        );
    }
}


export async function proxyToBackendChange<T>(endpoint: string, payload?: T | null, method: "POST" | "PUT" | "DELETE" = "POST"){
    const session = await auth()
    const backendUrl = new URL(BACKEND_DOMAIN + endpoint);
    const headers = {"Content-Type": "application/json"}
    if(session){
        // @ts-ignore
        headers['Authorization'] = `Bearer ${session?.backendJwt}`
    }

    let body = payload && JSON.stringify(payload)
    try {
        const backendResponse = await fetch(backendUrl.toString(), {
            method,
            headers,
            cache: "no-store",
            body
        });
        if (backendResponse.ok){
            const data = await backendResponse.json();
            return NextResponse.json(data, { status: backendResponse.status });
        }else{
            const data = await backendResponse.text();
            return NextResponse.json(data, { status: backendResponse.status });
        }
    } catch (error) {
        console.error("Error calling backend endpoint:", error);
        return NextResponse.json(
            { msg: "Internal server error", code: 500 },
            { status: 500 }
        );
    }
}
