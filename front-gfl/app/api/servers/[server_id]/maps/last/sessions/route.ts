import { NextResponse } from "next/server";
import {auth} from "auth";

export async function GET(req: Request, context: { params: Promise<{ server_id: string }> }) {
    const { server_id } = await context.params;
    const url = new URL(req.url);

    const backendUrl = new URL(
        `http://backend:3000/servers/${server_id}/maps/last/sessions`
    );
    const session = await auth()
    const headers = {"Content-Type": "application/json"}
    if(session){
        // @ts-ignore
        headers['Authorization'] = `Bearer ${session?.backendJwt}`
    }

    url.searchParams.forEach((value, key) => {
        backendUrl.searchParams.set(key, value);
    });

    const backendResponse = await fetch(backendUrl.toString(), {
        method: "GET",
        headers,
        cache: "no-store",
    });

    const data = await backendResponse.json();

    return NextResponse.json(data, { status: backendResponse.status });
}