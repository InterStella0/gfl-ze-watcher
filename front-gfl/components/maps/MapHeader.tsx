'use client'
import { useEffect, useState} from "react";
import {getMapImage} from "utils/generalUtils.ts";
import {Clock, Users, RotateCcw, User, AlarmClock, AlertTriangle} from "lucide-react";
import dayjs from "dayjs";
import ErrorCatch from "../ui/ErrorMessage.tsx";
import {Skeleton} from "components/ui/skeleton";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "components/ui/tooltip";
import {useMapContext} from "../../app/servers/[server_slug]/maps/[map_name]/MapContext";
import {useServerData} from "../../app/servers/[server_slug]/ServerDataProvider";
import relativeTime from "dayjs/plugin/relativeTime";
import Image from "next/image";
dayjs.extend(relativeTime);

function MapHeaderDisplay() {
    const [url, setUrl] = useState<string | null>(null);
    const { name, analyze, info, notReady } = useMapContext();
    const { server} = useServerData()
    const server_id = server.id
    const isLoading = !analyze
    let cooldownLeft = 0
    let cooldown = null
    if (info){
        cooldown = dayjs(info?.current_cooldown)
        cooldownLeft = cooldown.diff(dayjs(), 'second')
    }

    useEffect(() => {
        setUrl(undefined)
        getMapImage(server_id, name).then(e => setUrl(e? e.extra_large: null))
    }, [server_id, name]);

    return (
        <TooltipProvider>
            <div className="relative overflow-hidden rounded-2xl h-full">
                <div className="w-full h-full max-h-[400px] overflow-hidden flex">
                    {url !== null ? (
                        <Image
                            src={url}
                            width={1051}
                            height={400}
                            className="object-cover w-full max-h-[400px] block"
                            alt={`Map ${name}`}
                            title={name}
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-[400px] bg-muted" />
                    )}
                </div>

                {/* Top-left cooldown badge */}
                <div className="absolute top-0 left-0 p-2 sm:p-4">
                    {cooldownLeft > 0 && (
                        <div className="bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex flex-row items-center gap-1 text-amber-500">
                                        <AlarmClock className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                                        <span className="text-xs sm:text-sm md:text-base font-medium" suppressHydrationWarning>
                                            Cooldown ends in {cooldown?.fromNow(true)}
                                        </span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent suppressHydrationWarning>
                                    {cooldown?.format('lll')}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                </div>

                {/* Top-right not ready warning */}
                <div className="absolute top-0 right-0 p-2 sm:p-4">
                    {notReady && (
                        <div className="bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex flex-row items-center gap-1 text-destructive">
                                        <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                                        <span className="text-xs sm:text-sm md:text-base font-medium">
                                            Data is not ready.
                                        </span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Still calculating, data is not ready. Come back later~
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                </div>

                {/* Bottom gradient overlay with stats */}
                <div className="absolute bottom-0 left-0 p-2 sm:p-4 text-start w-full bg-gradient-to-t from-black/80 to-transparent">
                    <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-2 sm:mb-4">
                        {name}
                    </h1>
                    <div className="flex flex-wrap gap-1 sm:gap-2 items-center">
                        {/* Total playtime */}
                        <div className="flex items-center mr-2 sm:mr-4 mb-2 sm:mb-0">
                            <Clock className="text-white h-3.5 w-3.5 sm:h-5 sm:w-5" />
                            {isLoading && (
                                <>
                                    <Skeleton className="w-12 h-4 ml-1 bg-white/20" />
                                    <Skeleton className="w-24 h-4 ml-1 bg-white/20 hidden sm:inline-block" />
                                </>
                            )}
                            {!isLoading && (
                                <>
                                    <span className="text-white ml-1 text-xs sm:text-sm md:text-base font-medium">
                                        {analyze? (analyze.total_playtime / 60 / 60).toLocaleString('en-US', {minimumFractionDigits: 3}): 0}h
                                    </span>
                                    <span className="text-white ml-1 text-xs sm:text-sm md:text-base font-medium hidden sm:inline">
                                        Total playtime
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Sessions */}
                        <div className="flex items-center mr-2 sm:mr-4 mb-2 sm:mb-0">
                            <Users className="text-white h-3.5 w-3.5 sm:h-5 sm:w-5" />
                            {isLoading && (
                                <>
                                    <Skeleton className="w-8 h-4 ml-1 bg-white/20" />
                                    <Skeleton className="w-16 h-4 ml-1 bg-white/20 hidden sm:inline-block" />
                                </>
                            )}
                            {!isLoading && (
                                <>
                                    <span className="text-white ml-1 text-xs sm:text-sm md:text-base font-medium">
                                        {analyze?.total_sessions.toLocaleString()}
                                    </span>
                                    <span className="text-white ml-1 text-xs sm:text-sm md:text-base font-medium hidden sm:inline">
                                        Sessions
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Last played */}
                        <div className="flex items-center mr-2 sm:mr-4 mb-2 sm:mb-0">
                            <RotateCcw className="text-white h-3.5 w-3.5 sm:h-5 sm:w-5" />
                            {isLoading && (
                                <>
                                    <Skeleton className="w-16 h-4 ml-1 bg-white/20" />
                                    <Skeleton className="w-20 h-4 ml-1 bg-white/20 hidden sm:inline-block" />
                                </>
                            )}
                            {!isLoading && (
                                <>
                                    <span className="text-white ml-1 text-xs sm:text-sm md:text-base font-medium hidden sm:inline">
                                        Last played
                                    </span>
                                    <span className="text-white ml-1 text-xs sm:text-sm md:text-base font-medium">
                                        {dayjs(analyze?.last_played).fromNow()}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Unique players */}
                        <div className="flex items-center mb-2 sm:mb-0">
                            <User className="text-white h-3.5 w-3.5 sm:h-5 sm:w-5" />
                            {isLoading && (
                                <>
                                    <Skeleton className="w-10 h-4 ml-1 bg-white/20" />
                                    <Skeleton className="w-32 h-4 ml-1 bg-white/20 hidden sm:inline-block" />
                                </>
                            )}
                            {!isLoading && (
                                <>
                                    <span className="text-white ml-1 text-xs sm:text-sm md:text-base font-medium">
                                        {analyze?.unique_players.toLocaleString()}
                                    </span>
                                    <span className="text-white ml-1 text-xs sm:text-sm md:text-base font-medium hidden sm:inline">
                                        have played this map
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

export default function MapHeader(){
    return <ErrorCatch message="Couldn't load map header :/">
        <MapHeaderDisplay />
    </ErrorCatch>
}
