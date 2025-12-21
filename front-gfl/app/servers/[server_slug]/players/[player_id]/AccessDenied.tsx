import { Card } from "components/ui/card";
import { Lock } from "lucide-react";

export default function AccessDenied() {
    return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <Card className="p-8 text-center max-w-lg">
                <Lock className="w-16 h-16 text-destructive mx-auto mb-4" />
                <h1 className="text-3xl font-semibold mb-4">
                    Access Denied
                </h1>
                <p className="text-muted-foreground">
                    This player has chosen to anonymize their profile. You need to be logged in as this player, or be a community administrator to view this profile.
                </p>
            </Card>
        </div>
    );
}
