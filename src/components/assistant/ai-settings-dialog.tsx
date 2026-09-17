import { useState } from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';

import { useStore } from '../../store';
import { PROVIDER_PRESETS, presetFor } from '../../ai/providers';
import { clearAiSettings, DEFAULT_AI_SETTINGS } from '../../core/ai-settings-storage';
import { cn } from '@/lib/utils';
import { Segmented } from '@/components/ui/segmented';
import { IconButton } from '@/components/ui/icon-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { ProviderId } from '../../ai/types';

interface AiSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PROVIDER_OPTIONS = PROVIDER_PRESETS.map((p) => ({ value: p.id, label: p.label }));

export function AiSettingsDialog({ open, onOpenChange }: AiSettingsDialogProps) {
  const settings = useStore((s) => s.aiSettings);
  const setAiSettings = useStore((s) => s.setAiSettings);
  const [showKey, setShowKey] = useState(false);
  const [confirmForget, setConfirmForget] = useState(false);

  const preset = presetFor(settings.provider);

  const handleProvider = (provider: ProviderId) => {
    const next = presetFor(provider);
    setAiSettings({ provider, model: next.defaultModel, baseUrl: next.baseUrl, apiKey: '' });
  };

  const handleForget = () => {
    clearAiSettings();
    setAiSettings(DEFAULT_AI_SETTINGS);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assistant settings</DialogTitle>
            <DialogDescription>
              VoxBrush has no server. Your key is kept in this browser and is sent only to the
              provider you pick.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="label-section">Provider</label>
              <Segmented
                value={settings.provider}
                options={PROVIDER_OPTIONS}
                onChange={handleProvider}
                className="w-full"
                itemClassName="flex-1"
                aria-label="Provider"
              />
              <p className="text-[11px] text-text-muted">{preset.docsLabel}</p>
            </div>

            {settings.provider === 'openai-compatible' && (
              <div className="flex flex-col gap-2">
                <label className="label-section" htmlFor="ai-base-url">
                  Base URL
                </label>
                <input
                  id="ai-base-url"
                  className="field field-mono w-full"
                  value={settings.baseUrl}
                  onChange={(e) => setAiSettings({ baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  spellCheck={false}
                />
                <p className="text-[11px] leading-relaxed text-text-muted">
                  The root that /chat/completions hangs off. A local server needs to allow this
                  page's origin.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="label-section" htmlFor="ai-key">
                API key
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="ai-key"
                  type={showKey ? 'text' : 'password'}
                  className="field field-mono flex-1"
                  value={settings.apiKey}
                  onChange={(e) => setAiSettings({ apiKey: e.target.value })}
                  placeholder={preset.keyHint}
                  spellCheck={false}
                  autoComplete="off"
                />
                <IconButton
                  label={showKey ? 'Hide the key' : 'Show the key'}
                  side="left"
                  onClick={() => setShowKey((v) => !v)}
                >
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </IconButton>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="label-section" htmlFor="ai-model">
                Model
              </label>
              <input
                id="ai-model"
                className="field field-mono w-full"
                value={settings.model}
                onChange={(e) => setAiSettings({ model: e.target.value })}
                placeholder={preset.defaultModel}
                spellCheck={false}
              />
              {preset.models.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {preset.models.map((model) => (
                    <button
                      key={model}
                      type="button"
                      className={cn('btn btn-dense font-mono', settings.model === model && 'active')}
                      onClick={() => setAiSettings({ model })}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DialogBody>

          <DialogFooter className="justify-between">
            <button
              type="button"
              className="btn btn-ghost text-danger hover:text-danger"
              onClick={() => setConfirmForget(true)}
            >
              <Trash2 className="size-3.5" />
              Forget key
            </button>
            <button type="button" className="btn btn-primary" onClick={() => onOpenChange(false)}>
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmForget}
        onOpenChange={setConfirmForget}
        title="Forget the stored key?"
        description="The key is removed from this browser and the assistant stops working until you paste it again."
        confirmLabel="Forget it"
        onConfirm={handleForget}
      />
    </>
  );
}
