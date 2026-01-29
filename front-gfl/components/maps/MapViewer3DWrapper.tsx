'use client'
import dynamic from 'next/dynamic'

const MapViewer3D = dynamic(() => import('./MapViewer3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-lg font-medium">Loading 3D viewer...</div>
        <div className="text-sm text-muted-foreground mt-2">
          Initializing Three.js renderer
        </div>
      </div>
    </div>
  )
})

export default function MapViewer3DWrapper({ mapName }: { mapName: string }) {
  return <MapViewer3D mapName={mapName} />
}
