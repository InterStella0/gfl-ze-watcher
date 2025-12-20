import { Box, Container } from "@mui/material";
import UserProfile from "components/users/UserProfile";
import UserCommunityConnections from "components/users/UserCommunityConnections";
import getServerUser from "../../../getServerUser";
import { getCommunity } from "../../../getCommunity";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { DiscordUser } from "types/users";

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

    // Determine if this is the current user's profile
    const isCurrentUser = user_id === "me";

    const userDataPromise = getUserData(user_id, isCurrentUser);
    const communitiesPromise = getCommunity();

    // Extract userId separately for the connections component
    const userIdPromise = userDataPromise.then(data => data.userId);

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <UserProfile userPromise={userDataPromise} />
                <UserCommunityConnections
                    communitiesPromise={communitiesPromise}
                    userIdPromise={userIdPromise}
                    isCurrentUser={isCurrentUser}
                />
            </Box>
        </Container>
    );
}