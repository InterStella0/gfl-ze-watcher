'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from 'components/ui/table';
import { Button } from 'components/ui/button';
import { Badge } from 'components/ui/badge';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { Switch } from 'components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from 'components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from 'components/ui/select';
import { Skeleton } from 'components/ui/skeleton';
import { Checkbox } from 'components/ui/checkbox';
import { ChevronLeft, ChevronRight, Search, Pencil } from 'lucide-react';
import { fetchApiUrl } from 'utils/generalUtils';
import type {
  AdminMapEntry,
  AdminMapMetadataResponse,
  AdminMapServerEntry,
  UpdateGlobalMapMetadataDto,
  UpdateServerMapMetadataDto,
} from 'types/admin';

// ─── Types ────────────────────────────────────────────────────────────────────

type TriState = 'true' | 'false' | 'null';

function boolToTri(v: boolean | null): TriState {
  if (v === true) return 'true';
  if (v === false) return 'false';
  return 'null';
}

function triToBool(v: TriState): boolean | null {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function BoolBadge({ value, globalValue }: { value: boolean | null; globalValue?: boolean | null }) {
  const effective = value ?? globalValue ?? null;
  if (effective === true)
    return <Badge variant="default" className="bg-green-600 text-white">Yes</Badge>;
  if (effective === false)
    return <Badge variant="secondary">No</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">—</Badge>;
}

// ─── Per-server editor (single selected server) ───────────────────────────────

function ServerEditor({
  map,
  onSaved,
}: {
  map: AdminMapEntry;
  onSaved: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(map.servers[0]?.server_id ?? '');
  const entry = map.servers.find((s) => s.server_id === selectedId) ?? null;

  const [isTryhard, setIsTryhard] = useState<TriState>('null');
  const [isCasual, setIsCasual] = useState<TriState>('null');
  const [workshopId, setWorkshopId] = useState('');
  const [resolvedWorkshopId, setResolvedWorkshopId] = useState('');
  const [noNoms, setNoNoms] = useState(false);
  const [minPlayers, setMinPlayers] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (entry) {
      setIsTryhard(boolToTri(entry.is_tryhard));
      setIsCasual(boolToTri(entry.is_casual));
      setWorkshopId(entry.workshop_id?.toString() ?? '');
      setResolvedWorkshopId(entry.resolved_workshop_id?.toString() ?? '');
      setNoNoms(entry.no_noms);
      setMinPlayers(entry.min_players?.toString() ?? '');
      setMaxPlayers(entry.max_players?.toString() ?? '');
    }
  }, [entry]);

  const handleSave = async () => {
    if (!entry) return;
    setSaving(true);
    try {
      const dto: UpdateServerMapMetadataDto = {
        server_id: entry.server_id,
        map_name: map.map_name,
        is_tryhard: triToBool(isTryhard),
        is_casual: triToBool(isCasual),
        workshop_id: workshopId ? Number(workshopId) : null,
        resolved_workshop_id: resolvedWorkshopId ? Number(resolvedWorkshopId) : null,
        no_noms: noNoms,
        min_players: minPlayers ? Number(minPlayers) : null,
        max_players: maxPlayers ? Number(maxPlayers) : null,
      };
      await fetchApiUrl('/admin/map-metadata/server', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (e) {
      console.error('Failed to save server map metadata:', e);
    } finally {
      setSaving(false);
    }
  };

  if (map.servers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        This map has no server entries.
      </p>
    );
  }

  const globalTryhardLabel = map.global_is_tryhard === true ? 'Yes' : map.global_is_tryhard === false ? 'No' : 'unset';
  const globalCasualLabel = map.global_is_casual === true ? 'Yes' : map.global_is_casual === false ? 'No' : 'unset';

  return (
    <div className="space-y-4 pt-2">
      {/* Server selector */}
      <div className="space-y-1.5">
        <Label>Server</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a server" />
          </SelectTrigger>
          <SelectContent>
            {map.servers.map((s) => (
              <SelectItem key={s.server_id} value={s.server_id}>
                {s.server_name || s.server_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {entry && (
        <>
          <div className="grid grid-cols-2 gap-4">
            {/* is_tryhard override */}
            <div className="space-y-1.5">
              <Label>Tryhard Override</Label>
              <Select value={isTryhard} onValueChange={(v) => setIsTryhard(v as TriState)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">— inherit global ({globalTryhardLabel})</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* is_casual override */}
            <div className="space-y-1.5">
              <Label>Casual Override</Label>
              <Select value={isCasual} onValueChange={(v) => setIsCasual(v as TriState)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">— inherit global ({globalCasualLabel})</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* workshop_id override */}
            <div className="space-y-1.5">
              <Label>Workshop ID Override</Label>
              <Input
                type="number"
                placeholder={map.global_workshop_id?.toString() ?? '(global)'}
                value={workshopId}
                onChange={(e) => setWorkshopId(e.target.value)}
              />
            </div>

            {/* resolved_workshop_id override */}
            <div className="space-y-1.5">
              <Label>Resolved Workshop ID Override</Label>
              <Input
                type="number"
                placeholder={map.global_resolved_workshop_id?.toString() ?? '(global)'}
                value={resolvedWorkshopId}
                onChange={(e) => setResolvedWorkshopId(e.target.value)}
              />
            </div>

            {/* min_players */}
            <div className="space-y-1.5">
              <Label>Min Players</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={minPlayers}
                onChange={(e) => setMinPlayers(e.target.value)}
              />
            </div>

            {/* max_players */}
            <div className="space-y-1.5">
              <Label>Max Players</Label>
              <Input
                type="number"
                min={0}
                placeholder="no limit"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
              />
            </div>
          </div>

          {/* no_noms */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="no-noms"
              checked={noNoms}
              onCheckedChange={(v) => setNoNoms(Boolean(v))}
            />
            <Label htmlFor="no-noms" className="cursor-pointer">No Nominations</Label>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Server'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

function EditMapDialog({
  map,
  open,
  onClose,
  onSaved,
}: {
  map: AdminMapEntry | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [globalIsTryhard, setGlobalIsTryhard] = useState(false);
  const [globalIsCasual, setGlobalIsCasual] = useState(false);
  const [globalWorkshopId, setGlobalWorkshopId] = useState('');
  const [globalResolvedWorkshopId, setGlobalResolvedWorkshopId] = useState('');
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savedGlobal, setSavedGlobal] = useState(false);

  useEffect(() => {
    if (map) {
      setGlobalIsTryhard(map.global_is_tryhard ?? false);
      setGlobalIsCasual(map.global_is_casual ?? false);
      setGlobalWorkshopId(map.global_workshop_id?.toString() ?? '');
      setGlobalResolvedWorkshopId(map.global_resolved_workshop_id?.toString() ?? '');
    }
  }, [map]);

  const handleSaveGlobal = async () => {
    if (!map) return;
    setSavingGlobal(true);
    try {
      const dto: UpdateGlobalMapMetadataDto = {
        map_name: map.map_name,
        is_tryhard: globalIsTryhard,
        is_casual: globalIsCasual,
        workshop_id: globalWorkshopId ? Number(globalWorkshopId) : null,
        resolved_workshop_id: globalResolvedWorkshopId ? Number(globalResolvedWorkshopId) : null,
      };
      await fetchApiUrl('/admin/map-metadata/global', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      setSavedGlobal(true);
      setTimeout(() => setSavedGlobal(false), 2000);
      onSaved();
    } catch (e) {
      console.error('Failed to save global map metadata:', e);
    } finally {
      setSavingGlobal(false);
    }
  };

  if (!map) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">{map.map_name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="global" className="flex-1 flex flex-col min-h-0">
          <TabsList className="shrink-0">
            <TabsTrigger value="global">Global</TabsTrigger>
            <TabsTrigger value="servers">
              Per-Server
              <Badge variant="secondary" className="ml-1.5 text-xs">{map.servers.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Global Tab */}
          <TabsContent value="global" className="flex-1 overflow-auto">
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <Label className="text-sm font-medium">Tryhard</Label>
                    <p className="text-xs text-muted-foreground">Mark as tryhard map</p>
                  </div>
                  <Switch checked={globalIsTryhard} onCheckedChange={setGlobalIsTryhard} />
                </div>

                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <Label className="text-sm font-medium">Casual</Label>
                    <p className="text-xs text-muted-foreground">Mark as casual map</p>
                  </div>
                  <Switch checked={globalIsCasual} onCheckedChange={setGlobalIsCasual} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Workshop ID</Label>
                  <Input
                    type="number"
                    placeholder="Steam Workshop ID"
                    value={globalWorkshopId}
                    onChange={(e) => setGlobalWorkshopId(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Resolved Workshop ID</Label>
                  <Input
                    type="number"
                    placeholder="Resolved Workshop ID"
                    value={globalResolvedWorkshopId}
                    onChange={(e) => setGlobalResolvedWorkshopId(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Global settings apply to all servers unless a per-server override is set.
              </p>

              <div className="flex justify-end">
                <Button onClick={handleSaveGlobal} disabled={savingGlobal}>
                  {savingGlobal ? 'Saving…' : savedGlobal ? 'Saved!' : 'Save Global'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Per-Server Tab */}
          <TabsContent value="servers" className="flex-1 overflow-auto">
            <ServerEditor map={map} onSaved={onSaved} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export default function MapMetadataAdminPage() {
  const [maps, setMaps] = useState<AdminMapEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingMap, setEditingMap] = useState<AdminMapEntry | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: PAGE_SIZE.toString(),
      };
      if (debouncedSearch) params.search = debouncedSearch;
      const data = await fetchApiUrl('/admin/map-metadata', { params }) as AdminMapMetadataResponse;
      setMaps(data.maps ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error('Failed to fetch map metadata:', e);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 350);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const refreshCurrentMap = useCallback(async () => {
    if (!editingMap) return;
    const params: Record<string, string> = {
      page: page.toString(),
      limit: PAGE_SIZE.toString(),
      search: editingMap.map_name,
    };
    try {
      const data = await fetchApiUrl('/admin/map-metadata', { params }) as AdminMapMetadataResponse;
      const refreshed = data.maps.find((m) => m.map_name === editingMap.map_name);
      if (refreshed) setEditingMap(refreshed);
    } catch {}
    fetchData();
  }, [editingMap, page, fetchData]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Map Metadata</h1>
          <p className="text-sm text-muted-foreground">
            Manage global and per-server map settings. Global values apply to all servers unless overridden.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search maps…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Map Name</TableHead>
              <TableHead className="w-24 text-center">Tryhard</TableHead>
              <TableHead className="w-24 text-center">Casual</TableHead>
              <TableHead className="w-36">Workshop ID</TableHead>
              <TableHead className="w-44">Resolved Workshop ID</TableHead>
              <TableHead className="w-20 text-center">Servers</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : maps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No maps found.
                </TableCell>
              </TableRow>
            ) : (
              maps.map((map) => (
                <TableRow key={map.map_name}>
                  <TableCell className="font-mono text-sm">{map.map_name}</TableCell>
                  <TableCell className="text-center">
                    <BoolBadge value={map.global_is_tryhard} />
                  </TableCell>
                  <TableCell className="text-center">
                    <BoolBadge value={map.global_is_casual} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {map.global_workshop_id ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {map.global_resolved_workshop_id ?? '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{map.servers.length}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingMap(map)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} maps
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <EditMapDialog
        map={editingMap}
        open={editingMap !== null}
        onClose={() => setEditingMap(null)}
        onSaved={refreshCurrentMap}
      />
    </div>
  );
}
