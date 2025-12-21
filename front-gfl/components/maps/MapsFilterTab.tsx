import {Tabs, TabsList, TabsTrigger} from 'components/ui/tabs';
import {Dispatch} from "react";

export type FilterTypes = "casual" | "tryhard" | "available" | "favorites" | "all"
export default function MapsFilterTabs({
    filterTab,
    setFilterTab,
    setPage,
}: { filterTab: FilterTypes, setFilterTab: Dispatch<FilterTypes>, setPage: Dispatch<number> }) {
    return (
        <div className="border border-border rounded-lg bg-card mb-6">
            <Tabs
                value={filterTab}
                onValueChange={(newValue: FilterTypes) => {
                    setFilterTab(newValue);
                    setPage(0);
                }}
            >
                <TabsList className="w-full justify-start overflow-x-auto md:overflow-visible bg-transparent p-0 h-auto rounded-none border-b border-border">
                    <TabsTrigger
                        value="all"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium text-sm px-4 py-3"
                    >
                        All Maps
                    </TabsTrigger>
                    <TabsTrigger
                        value="casual"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium text-sm px-4 py-3"
                    >
                        Casual
                    </TabsTrigger>
                    <TabsTrigger
                        value="tryhard"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium text-sm px-4 py-3"
                    >
                        Tryhard
                    </TabsTrigger>
                    <TabsTrigger
                        value="available"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium text-sm px-4 py-3"
                    >
                        Available Now
                    </TabsTrigger>
                    <TabsTrigger
                        value="favorites"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium text-sm px-4 py-3"
                    >
                        Favorites
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
    );
}
