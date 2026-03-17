'use client'

import { GuideCategory, GuideCategoryType } from 'types/guides';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from 'components/ui/select';

interface CategoryFilterProps {
    value: string;
    onChange: (value: string) => void;
}

export default function CategoryFilter({ value, onChange }: CategoryFilterProps) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(GuideCategory).map(([key, label]) => (
                    <SelectItem key={key} value={label}>
                        {label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
