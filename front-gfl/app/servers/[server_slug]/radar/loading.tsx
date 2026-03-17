import { Skeleton } from "components/ui/skeleton";
import { Progress } from "components/ui/progress";

export default function Loading() {
    return (
        <div className="w-full">
            <Progress className="h-1 w-full" />

            <div className="m-4">
                <Skeleton className="rounded-lg w-full h-full" />
            </div>
        </div>
    );
}
