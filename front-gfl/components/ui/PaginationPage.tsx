"use client";

import {
    Pagination,
    PaginationItem,
    PaginationPrevious,
    PaginationNext,
} from "components/ui/pagination";
import { Dispatch } from "react";

interface PaginationPageProps {
    totalItems: number;
    perPage: number;
    page: number;
    setPage: Dispatch<number>;
}

export default function PaginationPage({ totalItems, perPage, page, setPage }: PaginationPageProps) {
    const totalPages = Math.ceil(totalItems / perPage);

    return (
        <Pagination>
            <PaginationPrevious onClick={() => setPage(Math.max(page - 1, 0))}>
                Prev
            </PaginationPrevious>

            {Array.from({ length: totalPages }, (_, i) => (
                <PaginationItem key={i} onClick={() => setPage(i)} className={page === i ? "bg-primary text-white" : ""}>
                    {i + 1}
                </PaginationItem>
            ))}

            <PaginationNext onClick={() => setPage(Math.min(page + 1, totalPages - 1))}>
                Next
            </PaginationNext>
        </Pagination>
    );
}
