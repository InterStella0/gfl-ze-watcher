import Box from "@mui/material/Box";
import {Skeleton} from "@mui/material";

export default function SkeletonBarGraph(
    {width = 400, height = 300, textWidth = 90, barHeight = 10, amount = 10,
        gap = ".1rem", sx = {}, sorted= false
    }
) {
    const minFactor = 0.2;
    const maxFactor = 0.8;
    const maxWidth = width * maxFactor;
    const minWidth = width * minFactor;

    const randomValues = Array
        .from({ length: amount }, () => Math.random())
        if (sorted)
            randomValues.sort((a, b) => b - a);
    const barWidths = randomValues.map(val => val * (maxWidth - minWidth) + minWidth);

    return <>
        <Box width="100%" height={height} display="flex" flexDirection="column" gap={gap} sx={{m: '1rem', ...sx}}>
            {barWidths.map((width, index) => <div style={{display: 'flex', alignItems: 'center'}} key={index}>
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