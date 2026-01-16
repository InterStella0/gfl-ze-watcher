import {proxyToBackend} from "lib/apiProxy";

// GET /api/accounts/me/push/subscription
export async function GET(req: Request) {
    return await proxyToBackend("/accounts/me/push/subscriptions");
}
