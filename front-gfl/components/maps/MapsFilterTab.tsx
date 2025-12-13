import {Card, Tabs, Tab, useMediaQuery, useTheme} from '@mui/material';
import {Dispatch} from "react";

export type FilterTypes = "casual" | "tryhard" | "available" | "favorites" | "all"
export default function MapsFilterTabs({
    filterTab,
    setFilterTab,
    setPage,
}: { filterTab: FilterTypes, setFilterTab: Dispatch<FilterTypes>, setPage: Dispatch<number> }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    return (
        <Card sx={{ mb: 3 }}>
            <Tabs
                value={filterTab}
                onChange={(_, newValue) => {
                    setFilterTab(newValue);
                    setPage(0);
                }}
                variant={isMobile ? "scrollable" : "standard"}
                scrollButtons="auto"
                sx={{
                    '& .MuiTab-root': {
                        fontWeight: 'medium',
                        textTransform: 'none',
                        fontSize: '0.875rem'
                    }
                }}
            >
                <Tab label="All Maps" value="all" />
                <Tab label="Casual" value="casual" />
                <Tab label="Tryhard" value="tryhard" />
                <Tab label="Available Now" value="available" />
                <Tab label="Favorites" value="favorites" />
            </Tabs>
        </Card>
    );
}