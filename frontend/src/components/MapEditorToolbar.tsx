import React from 'react';
import { MousePointer2, Circle, GitPullRequest, Trash2, Zap, Download, Upload, DoorOpen, Footprints, Save, X } from 'lucide-react';

export type EditTool = 'select' | 'room' | 'stairs' | 'entrance' | 'path' | 'delete';
export type NodeKind = 'room' | 'stairs' | 'entrance' | 'corridor';

interface Props {
  editTool: EditTool;
  onToolChange: (t: EditTool) => void;
  onAutoDetect: () => void;
  autoDetectOnOpen: boolean;
  onAutoDetectOnOpenChange: (enabled: boolean) => void;
  showRoomOverlays: boolean;
  onShowRoomOverlaysChange: (enabled: boolean) => void;
  onExportGraph: () => void;
  onImportGraph: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onExit: () => void;
  isSaving: boolean;
  isDetecting: boolean;
  imageOpacity: number;
  onImageOpacityChange: (v: number) => void;
  hasBackgroundImage: boolean;
  nodeCount: number;
  edgeCount: number;
  poiCount: number;
}

const tools: { id: EditTool; icon: React.ElementType; label: string; color: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select / Drag', color: 'blue' },
  { id: 'room', icon: Circle, label: 'Add Room', color: 'emerald' },
  { id: 'stairs', icon: Footprints, label: 'Add Stairs', color: 'amber' },
  { id: 'entrance', icon: DoorOpen, label: 'Add Entrance', color: 'cyan' },
  { id: 'path', icon: GitPullRequest, label: 'Draw Path', color: 'indigo' },
  { id: 'delete', icon: Trash2, label: 'Delete', color: 'red' },
];

const hints: Record<EditTool, string> = {
  select: 'Click a node to select & rename. Drag nodes to reposition them.',
  room: 'Click on the map to place a room node. You can rename it after placing.',
  stairs: 'Click on the map to place a stair connector node.',
  entrance: 'Click on the map to place a building entrance node.',
  path: 'Click Node A, then Node B to draw a walkable path between them.',
  delete: 'Click any node or path to remove it.',
};

export default function MapEditorToolbar(props: Props) {
  return (
    <div className="space-y-3">
      {/* Top bar: Save + Exit */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">Map Editor</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={props.onSave} disabled={props.isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-50">
            <Save className="h-4 w-4" /> {props.isSaving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={props.onExit}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm">
            <X className="h-4 w-4" /> Exit Editor
          </button>
        </div>
      </div>

      {/* Auto-detect + Import/Export */}
      <div className="flex flex-wrap items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-2xl border border-amber-200 shadow-sm">
        <button onClick={props.onAutoDetect} disabled={props.isDetecting || !props.hasBackgroundImage}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 transition shadow-sm disabled:opacity-40">
          <Zap className="h-4 w-4" /> {props.isDetecting ? 'Detecting...' : 'Auto Detect Rooms'}
        </button>
        <label className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900">
          <input
            type="checkbox"
            className="accent-amber-600"
            checked={props.autoDetectOnOpen}
            onChange={(e) => props.onAutoDetectOnOpenChange(e.target.checked)}
          />
          Auto-run on editor open
        </label>
        <label className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900">
          <input
            type="checkbox"
            className="accent-amber-600"
            checked={props.showRoomOverlays}
            onChange={(e) => props.onShowRoomOverlaysChange(e.target.checked)}
          />
          Show room overlays
        </label>
        <span className="text-xs bg-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Experimental</span>
        <span className="text-xs text-amber-700">If auto-detect doesn't work well, use manual tools below.</span>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={props.onExportGraph}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer">
            <Upload className="h-3.5 w-3.5" /> Import
            <input type="file" accept=".json" className="hidden" onChange={props.onImportGraph} />
          </label>
        </div>
      </div>

      {/* Tool buttons */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Tools:</span>
        {tools.map((t) => {
          const active = props.editTool === t.id;
          return (
            <button key={t.id} onClick={() => props.onToolChange(t.id)}
              className={`px-3 py-2 flex items-center gap-1.5 text-xs rounded-xl font-semibold transition-all ${
                active
                  ? (t.id === 'delete' ? 'bg-red-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-md')
                  : (t.id === 'delete' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
              }`}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}

        {/* Image opacity */}
        {props.hasBackgroundImage && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500">Image:</span>
            <input type="range" min="0" max="100" value={props.imageOpacity * 100}
              onChange={(e) => props.onImageOpacityChange(Number(e.target.value) / 100)}
              className="w-20 h-1.5 accent-blue-600" />
            <span className="text-xs text-slate-500 w-7">{Math.round(props.imageOpacity * 100)}%</span>
          </div>
        )}
      </div>

      {/* Hint + Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs text-blue-700 font-medium bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
          💡 {hints[props.editTool]}
        </p>
        <div className="flex gap-2 text-xs text-slate-500">
          <span className="bg-white border border-slate-200 px-2 py-1 rounded-lg">{props.nodeCount} nodes</span>
          <span className="bg-white border border-slate-200 px-2 py-1 rounded-lg">{props.edgeCount} paths</span>
          <span className="bg-white border border-slate-200 px-2 py-1 rounded-lg">{props.poiCount} POIs</span>
        </div>
      </div>
    </div>
  );
}
