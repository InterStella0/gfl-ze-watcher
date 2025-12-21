'use client'
import {useState} from 'react';
import {Search, Loader2} from 'lucide-react';
import {SortByIndex} from "../../app/servers/[server_slug]/maps/MapsSearchIndex.tsx";
import {ServerMap} from "types/maps.ts";
import {Input} from "components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "components/ui/select";
import {Popover, PopoverContent, PopoverTrigger} from "components/ui/popover";
import {Command, CommandEmpty, CommandGroup, CommandItem, CommandList} from "components/ui/command";


export default function MapsSearchControls({
    searchInput,
    setSearchInput,
    setSearchTerm,
    setPage,
    sortBy,
    setSortBy,
    autocompleteOptions,
    autocompleteLoading,
}: {
    searchInput: string,
    setSearchInput: (searchInput: string) => void,
    setSearchTerm: (searchTerm: string) => void,
    setPage: (page: number) => void,
    sortBy: SortByIndex,
    setSortBy: (sortBy: SortByIndex) => void,
    autocompleteOptions: ServerMap[],
    autocompleteLoading: boolean,

}) {
    const [open, setOpen] = useState(false);

    const handleSelect = (value: string) => {
        setSearchInput(value);
        setSearchTerm(value);
        setPage(0);
        setOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(e.target.value);
        if (e.target.value.trim()) {
            setOpen(true);
        } else {
            setOpen(false);
        }
    };

    return (
        <div className="border border-border rounded-lg bg-card p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8">
                    <Popover open={open && autocompleteOptions.length > 0} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={searchInput}
                                    onChange={handleInputChange}
                                    onFocus={() => {
                                        if (searchInput.trim() && autocompleteOptions.length > 0) {
                                            setOpen(true);
                                        }
                                    }}
                                    placeholder="Search maps"
                                    className="pl-10 pr-10"
                                />
                                {autocompleteLoading && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                            </div>
                        </PopoverTrigger>
                        <PopoverContent
                            className="p-0"
                            align="start"
                            style={{width: 'var(--radix-popover-trigger-width)'}}
                        >
                            <Command>
                                <CommandList>
                                    <CommandEmpty>
                                        {autocompleteLoading ? "Loading maps..." : "No maps found"}
                                    </CommandEmpty>
                                    <CommandGroup>
                                        {autocompleteOptions.map((option) => (
                                            <CommandItem
                                                key={option.map}
                                                value={option.map}
                                                onSelect={() => handleSelect(option.map)}
                                            >
                                                <span className="font-medium">{option.map}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="md:col-span-4">
                    <Select
                        value={sortBy}
                        onValueChange={(value: SortByIndex) => {
                            setSortBy(value);
                            setPage(0);
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="LastPlayed">Recently Played</SelectItem>
                            <SelectItem value="HighestCumHour">Cumulative Hours</SelectItem>
                            <SelectItem value="UniquePlayers">Unique Players</SelectItem>
                            <SelectItem value="FrequentlyPlayed">Frequently Played</SelectItem>
                            <SelectItem value="HighestHour">Highest Hours</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
