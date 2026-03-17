'use client'

import { GuideSortType } from 'types/guides';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from 'components/ui/select';

interface SortFilterProps {
    value: GuideSortType;
    onChange: (value: GuideSortType) => void;
}

const sortOptions: { value: GuideSortType; label: string }[] = [
    { value: 'TopRated', label: 'Top Rated' },
    { value: 'Newest', label: 'Newest' },
    { value: 'Oldest', label: 'Oldest' },
    { value: 'MostDiscussed', label: 'Most Discussed' },
];

export default function SortFilter({ value, onChange }: SortFilterProps) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
                {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
