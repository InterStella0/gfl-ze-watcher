import { Star, Coffee, Mail } from "lucide-react";
import FooterFab from "./FooterFab";
import ThemeToggle from "./ThemeToggle";
import IconLink from "./IconLink";
import {SiDiscord, SiGithub, SiSteam} from "@icons-pack/react-simple-icons";
import {Button} from "components/ui/button.tsx";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <>
            <FooterFab />

            <footer className="relative mt-auto w-full overflow-hidden border-t-1 py-6">
                {/* Decorative background blobs */}
                <div className="absolute -top-4 left-[10%] h-10 w-10 rounded-full" />
                <div className="absolute -bottom-5 right-[15%] h-16 w-16 rounded-full" />
                <div className="absolute left-[80%] top-[40%] h-6 w-6 rounded-full" />

                <div className="container mx-auto max-w-6xl px-4">
                    {/* Top section: Copyright and social links */}
                    <div className="mb-4 flex flex-col items-center justify-between gap-6 md:mb-3 md:flex-row">
                        {/* Copyright */}
                        <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 fill-primary text-primary" />
                            <p className="text-sm text-muted-foreground">
                                &copy; {currentYear} ZE Graph. All rights reserved.
                            </p>
                        </div>

                        {/* Social links and theme toggle */}
                        <div className="flex items-center gap-1">
                            <ThemeToggle />

                            <div className="flex items-center">
                                <IconLink
                                    href="https://goes.prettymella.site/s/discord-zegraph"
                                    ariaLabel="Discord"
                                    tooltip="Support Server"
                                    icon={<SiDiscord className="h-5 w-5 text-primary" />}
                                />
                                <span className="ml-1 hidden text-xs text-foreground md:block">
                                    Support Server
                                </span>
                            </div>

                            <div className="flex items-center">
                                <IconLink
                                    href="https://steamcommunity.com/id/Stella667/"
                                    ariaLabel="Steam"
                                    tooltip="Steam: queeniemella"
                                    icon={<SiSteam className="h-5 w-5 text-primary" />}
                                />
                                <span className="ml-1 hidden text-xs text-foreground md:block">
                                    queeniemella
                                </span>
                            </div>

                            <div className="flex items-center">
                                <IconLink
                                    href="https://github.com/InterStella0/gfl-ze-watcher"
                                    ariaLabel="GitHub"
                                    tooltip="GitHub: InterStella0"
                                    icon={<SiGithub className="h-5 w-5 text-primary" />}
                                />
                                <span className="ml-1 hidden text-xs text-foreground md:block">
                                    InterStella0
                                </span>
                            </div>

                            <div className="flex items-center">
                                <IconLink
                                    href="https://ko-fi.com/interstella0"
                                    ariaLabel="Ko-Fi"
                                    tooltip="Support on Ko-Fi: interstella0"
                                    icon={<Coffee className="h-5 w-5 text-primary" />}
                                />
                                <span className="ml-1 hidden text-xs text-foreground md:block">
                                    interstella0
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom section: Message and contact button */}
                    <div className="relative mt-8 flex w-full flex-col items-center">
                        {/* Decorative dots */}
                        <div className="absolute -top-10 left-[15%] h-2 w-2 rounded-full bg-primary/40 sm:left-[30%] md:-top-16" />
                        <div className="absolute -top-2 right-[20%] h-1.5 w-1.5 rounded-full bg-secondary/40 md:-top-8 md:right-[32%]" />

                        <div className="relative flex w-full flex-col items-center justify-between gap-4 sm:flex-row">
                            <div className="flex justify-center sm:justify-start">
                                <div className="w-fit rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-secondary/10 px-6 py-2.5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
                                    <p className="text-sm font-medium tracking-wide text-foreground">
                                        Please be nice~
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-center sm:justify-end">
                                <Button
                                    variant="outline"
                                    asChild
                                    className="rounded-full shadow-sm transition-all hover:shadow-md"
                                >
                                    <a href="mailto:contact@prettymella.site">
                                        <Mail className="h-4 w-4" />
                                        contact@prettymella.site
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
}