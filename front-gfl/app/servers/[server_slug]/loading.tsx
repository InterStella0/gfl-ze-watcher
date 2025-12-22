import {Progress} from "components/ui/progress.tsx";

export default function Loading(){
    return <div className="w-[100%]">
        <Progress className="h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
            <div className="w-1/2 bg-primary animate-[progress_1.5s_linear_infinite] h-full" />
        </Progress>
    </div>
}