'use client'
import { useState, useEffect } from 'react';
import { Globe, Radar } from 'lucide-react';
import { getFlagUrl, fetchServerUrl } from "utils/generalUtils.ts";
import {useServerData} from "../../app/servers/[server_slug]/ServerDataProvider";
import Link from "next/link";
import Image from "next/image";
import {CountryStatistic} from "types/players.ts";
import { Card, CardContent, CardHeader } from "components/ui/card";
import { Button } from "components/ui/button";
import { Skeleton } from "components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "components/ui/pagination";

const CountriesSkeleton = () => (
    <div className="p-2 space-y-2">
        {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="py-2">
                <div className="flex items-center w-full justify-between">
                    <div className="flex items-center gap-2">
                        <Skeleton className="w-6 h-4" />
                        <Skeleton className="w-30 h-5" />
                    </div>
                    <Skeleton className="w-10 h-5" />
                </div>
            </div>
        ))}
    </div>
);

export default function PlayerByCountries() {
    const [countries, setCountries] = useState<CountryStatistic[]>([]);
    const [countriesLoading, setCountriesLoading] = useState<boolean>(true);
    const [countriesError, setCountriesError] = useState<string | null>(null);
    const [communityPage, setCommunityPage] = useState<number>(1);
    const { server } = useServerData()
    const serverId = server.id
    const COUNTRIES_PER_PAGE = 10;

    const fetchCountries = async () => {
        try {
            setCountriesLoading(true);
            setCountriesError(null);
            const data = await fetchServerUrl(serverId, '/players/countries');
            setCountries(data.countries || []);
        } catch (error) {
            console.error('Error fetching countries:', error);
            setCountriesError(error.message);
        } finally {
            setCountriesLoading(false);
        }
    };

    const getPaginatedCountries = () => {
        const startIndex = (communityPage - 1) * COUNTRIES_PER_PAGE;
        const endIndex = startIndex + COUNTRIES_PER_PAGE;
        return countries.slice(startIndex, endIndex);
    };

    const getTotalCountryPages = () => {
        return Math.ceil(countries.length / COUNTRIES_PER_PAGE);
    };

    useEffect(() => {
        fetchCountries();
    }, [serverId]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary"/>
                    <h2 className="text-lg font-semibold">Players by countries</h2>
                </div>
                <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                    <Link href={`/servers/${server.gotoLink}/radar`} className="flex items-center gap-2">
                        <Radar className="w-4 h-4" />
                        View Radar
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="pt-0">
                {countriesLoading ? (
                    <CountriesSkeleton />
                ) : countriesError ? (
                    <div className="p-4 text-center">
                        <p className="text-destructive">Error loading countries: {countriesError}</p>
                    </div>
                ) : (
                    <>
                        <div className="p-2 space-y-2">
                            {getPaginatedCountries().map((country) => (
                                <div key={country.code} className="py-2">
                                    <div className="flex items-center w-full justify-between">
                                        <div className="flex items-center gap-2">
                                            <Image
                                                src={getFlagUrl(country.code)}
                                                alt={country.name || 'Country Flag'}
                                                width={24}
                                                height={16}
                                            />
                                            <span>{country.name}</span>
                                        </div>
                                        <span className="text-primary font-semibold">
                                            {country.count}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {getTotalCountryPages() > 1 && (
                            <div className="flex justify-center pt-4">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={() => communityPage > 1 && setCommunityPage(communityPage - 1)}
                                                className={communityPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>
                                        {Array.from({ length: Math.min(5, getTotalCountryPages()) }, (_, i) => {
                                            const page = i + 1;
                                            return (
                                                <PaginationItem key={page}>
                                                    <PaginationLink
                                                        onClick={() => setCommunityPage(page)}
                                                        isActive={communityPage === page}
                                                        className="cursor-pointer"
                                                    >
                                                        {page}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            );
                                        })}
                                        <PaginationItem>
                                            <PaginationNext
                                                onClick={() => communityPage < getTotalCountryPages() && setCommunityPage(communityPage + 1)}
                                                className={communityPage >= getTotalCountryPages() ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};
