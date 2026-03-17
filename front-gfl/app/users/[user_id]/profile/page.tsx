import UserProfile from "components/users/UserProfile";
import UserCommunityConnections from "components/users/UserCommunityConnections";
import getServerUser from "../../../getServerUser";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { DiscordUser } from "types/users";
import {CommunityPlayerDetail} from "types/community.ts";
import {fetchApiUrl} from "utils/generalUtils.ts";
import ResponsiveAppBar from "components/ui/ResponsiveAppBar.tsx";
import * as React from "react";
import {Footer} from "react-day-picker";

async function getUserData(user_id: string, isCurrentUser: boolean) {
    if (isCurrentUser) {
        // Current user viewing their own profile
        const user = await getServerUser();
        if (!user) {
            redirect('/');
        }

        const session = await auth();
        // Access the steam property through type assertion since it's added in the auth callback
        const steamData = (session?.user as any)?.steam;
        const userId = steamData?.steamid || user.id;

        return {
            user,
            userId
        };
    } else {
        // Viewing another user's profile
        // For now, create a basic user object
        // TODO: Fetch user data from backend when endpoint is available
        const user: DiscordUser = {
            id: user_id,
            global_name: user_id, // Fallback, backend should provide actual name
            avatar: null
        };

        return {
            user,
            userId: user_id
        };
    }
}

export default async function Page({ params }: { params: Promise<{ user_id: string }> }) {
    const { user_id } = await params;

    const isCurrentUser = user_id === "me";
    const userDataPromise = getUserData(user_id, isCurrentUser);
    const communitiesData: Promise<CommunityPlayerDetail[]> = fetchApiUrl('/accounts/me/communities')

    return (<>
        <ResponsiveAppBar userPromise={userDataPromise} server={null} setDisplayCommunity={null} />
        <div className="container mx-auto max-w-7xl px-4 py-8">
            <div className="flex flex-col gap-6">
                <UserProfile userPromise={userDataPromise} />
                <UserCommunityConnections communitiesPromise={communitiesData} isCurrentUser={isCurrentUser} />
            </div>
        </div>
        <Footer />
    </>)
}
