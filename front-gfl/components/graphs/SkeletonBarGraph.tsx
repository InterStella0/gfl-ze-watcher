'use client'
import Box from "@mui/material/Box";
import {Skeleton, SxProps, Theme} from "@mui/material";
import {simpleRandom} from "utils/generalUtils";
import {useEffect, useState} from "react";

export default function SkeletonBarGraph(
    {width = 400, height = 300, textWidth = 90, barHeight = 10, amount = 10,
        gap = ".1rem", sx = {}, sorted= false
    }: {
        width?: number, height?: number, textWidth?: number, barHeight?: number, amount?: number, gap?: string,
        sorted?: boolean, sx?: SxProps<Theme>
    }
) {
    const [isClient, setIsClient] = useState(false);
    const minFactor = 0.2;
    const maxFactor = 0.8;
    const maxWidth = width * maxFactor;
    const minWidth = width * minFactor;
    useEffect(() => {
        setIsClient(true)
    }, []);
    const randomValues = Array
        .from({ length: amount }, () => simpleRandom(minWidth, maxWidth, isClient))

    if (sorted)
        randomValues.sort((a, b) => b - a);

    return <>
        <Box width="100%" height={height} display="flex" flexDirection="column" gap={gap} sx={{m: '1rem', ...sx}}>
            {randomValues.map((width, index) => <div style={{display: 'flex', alignItems: 'center'}} key={index}>
                    <Skeleton
                        variant="text"
                        width={textWidth}
                    />
                    <Skeleton
                        variant="rectangular"
                        sx={{mx: '1rem'}}
                        width={width}
                        height={barHeight}
                    />
                </div>
            )}
        </Box>
    </>
}