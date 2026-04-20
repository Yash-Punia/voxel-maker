import { useState, useRef } from 'react';
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels';
import { useStore } from '../../store';
import { DepthCanvas, type DepthViewMode } from './depth-canvas';
import { generateDepth, type DepthGenMode } from '../../core/depth-generate';
import { exportDepthMapPng, importDepthMapPng } from '../../core/depth-map-io';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

const MODE_LABELS: { id: DepthGenMode; label: string; title: string }[] = [
  { id: 'luminosity',   label: 'Luma',   title: 'Brighter colors → more depth' },
  { id: 'color-index',  label: 'Palette', title: 'Palette position → depth' },
  { id: 'noise',        label: 'Noise',  title: 'Random depth per cell' },
];

export function DepthEditor() {
  const { activeDepth, setActiveDepth, extrusionMode, setExtrusionMode, depthMultiplier, setDepthMultiplier, colorMap, depthMap, shapeMap, rotationMap, gridWidth, gridHeight, palette, pushSnapshot, setDepthMap, setShortcutScope } = useStore();

  const [viewMode, setViewMode] = useState<DepthViewMode>('depth');
  const [genMode, setGenMode] = useState<DepthGenMode>('luminosity');
  const [genMin, setGenMin] = useState(1);
  const [genMax, setGenMax] = useState(8);
  const [genInvert, setGenInvert] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const handleExportDepth = () => exportDepthMapPng(depthMap, colorMap, gridWidth, gridHeight);

  const handleImportDepth = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importDepthMapPng(file, gridWidth, gridHeight).then((newDepth) => {
      pushSnapshot({ colorMap: [...colorMap], depthMap: [...depthMap], shapeMap: [...shapeMap], rotationMap: [...rotationMap] });
      setDepthMap(newDepth);
    });
    e.target.value = '';
  };

  const handleApply = () => {
    const newDepth = generateDepth(colorMap, genMode, palette, { min: genMin, max: genMax, invert: genInvert });
    pushSnapshot({ colorMap: [...colorMap], depthMap: [...depthMap], shapeMap: [...shapeMap], rotationMap: [...rotationMap] });
    setDepthMap(newDepth);
  };

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'vxs-depth-inner',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  });

  return (
    <div
      className="flex flex-col bg-bg-panel overflow-hidden min-w-0 h-full"
      onMouseEnter={() => setShortcutScope('depth')}
      onMouseLeave={() => setShortcutScope(null)}
      onFocusCapture={() => setShortcutScope('depth')}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setShortcutScope(null);
        }
      }}
    >
      <div className="h-9 bg-bg-secondary border-b border-border flex items-center px-2.5 gap-2 shrink-0">
        <span className="label-title">Depth Editor</span>
        <div className="flex gap-0.5 ml-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`btn text-xs${viewMode === 'depth' ? ' active' : ''}`}
                onClick={() => setViewMode('depth')}
                title="Show depth values as cool-to-warm color ramp with numbers"
              >
                Depth
              </button>
            </TooltipTrigger>
            <TooltipContent>Cool-to-warm ramp + number labels</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`btn text-xs${viewMode === 'color' ? ' active' : ''}`}
                onClick={() => setViewMode('color')}
                title="Show actual paint colors for reference"
              >
                Color
              </button>
            </TooltipTrigger>
            <TooltipContent>Show actual paint colors for reference</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Group
        orientation="vertical"
        id="vxs-depth-inner"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        className="flex-1 overflow-hidden"
      >
        <Panel id="canvas" defaultSize={55} minSize={25}>
          <div className="flex h-full overflow-hidden">
            <DepthCanvas viewMode={viewMode} />
          </div>
        </Panel>
        <Separator className="resize-handle-v" />
        <Panel id="controls" defaultSize={45} minSize={25}>
          <div className="h-full overflow-y-auto bg-bg-secondary">
            <Accordion type="multiple" defaultValue={['brush']}>

              {/* Brush + extrusion controls */}
              <AccordionItem value="brush">
                <AccordionTrigger>Brush</AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary min-w-16">Depth:</span>
                      <input
                        type="number"
                        className="w-13 h-7 px-2 border border-transparent rounded-sm bg-bg-input text-text-primary text-xs text-center focus:outline-hidden focus:border-border-focus"
                        value={activeDepth}
                        min={0}
                        max={32}
                        title="Brush depth (0 = suppress, 1-32 = extrusion units)"
                        onChange={(e) => setActiveDepth(parseInt(e.target.value) || 0)}
                      />
                      <span className="text-xs text-text-muted">(0 = suppress)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary min-w-16">Multiplier:</span>
                      <input
                        type="range"
                        className="flex-1 h-3 accent-accent cursor-pointer"
                        value={depthMultiplier}
                        min={0.25}
                        max={4.0}
                        step={0.25}
                        title="Depth multiplier applied at export (0.25× – 4×)"
                        onChange={(e) => setDepthMultiplier(parseFloat(e.target.value))}
                      />
                      <span className="text-xs text-text-muted w-8 text-right">{depthMultiplier.toFixed(2)}×</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary min-w-16">Extrusion:</span>
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={`btn${extrusionMode === 'single' ? ' active' : ''}`}
                              onClick={() => setExtrusionMode('single')}
                              title="Front: extrude toward viewer (Z=0 to +depth)"
                            >
                              Front
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Front — Z=0 to +depth</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={`btn${extrusionMode === 'symmetric' ? ' active' : ''}`}
                              onClick={() => setExtrusionMode('symmetric')}
                              title="Center: extrude both ways (±depth/2)"
                            >
                              Center
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Center — ±depth/2</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={`btn${extrusionMode === 'back' ? ' active' : ''}`}
                              onClick={() => setExtrusionMode('back')}
                              title="Back: extrude away from viewer (-depth to Z=0)"
                            >
                              Back
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Back — −depth to Z=0</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Auto-depth generation */}
              <AccordionItem value="auto-depth">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    Auto Depth
                    <span className="text-[10px] normal-case tracking-normal text-text-muted">
                      {genMode === 'luminosity' ? 'Luma' : genMode === 'color-index' ? 'Palette' : 'Noise'} · {genMin}–{genMax}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary min-w-16">Mode:</span>
                      <div className="flex gap-1">
                        {MODE_LABELS.map((m) => (
                          <Tooltip key={m.id}>
                            <TooltipTrigger asChild>
                              <button
                                className={`btn text-xs${genMode === m.id ? ' active' : ''}`}
                                onClick={() => setGenMode(m.id)}
                                title={m.title}
                              >
                                {m.label}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{m.title}</TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary min-w-16">Min / Max:</span>
                      <input
                        type="number"
                        className="w-10 h-7 px-1 border border-transparent rounded-sm bg-bg-input text-text-primary text-xs text-center focus:outline-hidden focus:border-border-focus"
                        value={genMin}
                        min={1}
                        max={genMax}
                        onChange={(e) => setGenMin(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                      <span className="text-xs text-text-muted">–</span>
                      <input
                        type="number"
                        className="w-10 h-7 px-1 border border-transparent rounded-sm bg-bg-input text-text-primary text-xs text-center focus:outline-hidden focus:border-border-focus"
                        value={genMax}
                        min={genMin}
                        max={32}
                        onChange={(e) => setGenMax(Math.min(32, parseInt(e.target.value) || 1))}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        className="flex items-center gap-2 cursor-pointer select-none"
                        title="Flip mapping: lighter / higher index → shallower depth"
                      >
                        <input
                          type="checkbox"
                          className="size-3 accent-accent cursor-pointer"
                          checked={genInvert}
                          onChange={(e) => setGenInvert(e.target.checked)}
                        />
                        <span className="text-xs text-text-secondary">Invert</span>
                      </label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="btn btn-primary ml-auto text-xs"
                            onClick={handleApply}
                            title="Apply auto-depth to all painted cells"
                          >
                            Apply
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Apply auto-depth to all painted cells</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Depth map import / export */}
              <AccordionItem value="depth-png">
                <AccordionTrigger>Depth Map PNG</AccordionTrigger>
                <AccordionContent>
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="btn text-xs"
                          onClick={handleExportDepth}
                          title="Export depth map as grayscale PNG (brightness = depth)"
                        >
                          Export
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Export depth map as grayscale PNG</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="btn text-xs"
                          onClick={() => importRef.current?.click()}
                          title="Import grayscale PNG as depth map"
                        >
                          Import
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Import grayscale PNG as depth map</TooltipContent>
                    </Tooltip>
                    <input
                      ref={importRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleImportDepth}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </div>
        </Panel>
      </Group>
    </div>
  );
}
