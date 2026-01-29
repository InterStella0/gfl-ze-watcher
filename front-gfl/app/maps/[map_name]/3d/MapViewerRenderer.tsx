'use client'
import {useState} from "react";
import MapViewer3DWrapper from 'components/maps/MapViewer3DWrapper'
import { Button } from 'components/ui/button'
import {AlertTriangle, Boxes} from 'lucide-react'
import { Card } from 'components/ui/card'

export default function MapViewerRenderer({ map_name }: { map_name: string }){
    const [ isRenderingStarted, setIsRenderingStarted ] = useState<boolean>()
    return !isRenderingStarted ? (
        <Card className="max-w-md p-8 text-center">
            <Boxes className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">{map_name}</h2>
            <p className="text-muted-foreground mb-6">
                Load the interactive 3D model to explore this map with FPS controls
            </p>
            <Button size="lg" onClick={() => setIsRenderingStarted(true)}>
                Start Rendering
            </Button>
            <div className="mt-4 space-y-1">
                <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground text-left">
                        This is a compressed version of the map optimized for web viewing. It may take awhile to download.
                    </p>
                </div>
            </div>
        </Card>
    ) : (
        <MapViewer3DWrapper mapName={map_name} />
    )
}