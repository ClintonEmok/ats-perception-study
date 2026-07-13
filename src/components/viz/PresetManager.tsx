"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useFilterStore } from "@/store/useFilterStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PresetManagerProps {
  onPresetLoaded?: () => void;
}

const formatPresetDate = (timestamp: number) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
};

const normalizeName = (name: string) => name.trim();
const isValidName = (name: string) => name.length >= 3 && name.length <= 50;

const getUniqueName = (name: string, existing: string[]) => {
  const base = normalizeName(name);
  const lowerExisting = existing.map((item) => item.toLowerCase());
  if (!lowerExisting.includes(base.toLowerCase())) return base;
  let counter = 2;
  let candidate = `${base} (${counter})`;
  while (lowerExisting.includes(candidate.toLowerCase())) {
    counter += 1;
    candidate = `${base} (${counter})`;
  }
  return candidate;
};

export function PresetManager({ onPresetLoaded }: PresetManagerProps) {
  const presets = useFilterStore((state) => state.presets);
  const savePreset = useFilterStore((state) => state.savePreset);
  const loadPreset = useFilterStore((state) => state.loadPreset);
  const deletePreset = useFilterStore((state) => state.deletePreset);
  const renamePreset = useFilterStore((state) => state.renamePreset);

  const [saveOpen, setSaveOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const sortedPresets = useMemo(
    () => [...presets].sort((a, b) => b.createdAt - a.createdAt),
    [presets]
  );

  useEffect(() => {
    if (!toast) return;
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
    }, 2200);
    return () => {
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current);
        toastTimer.current = null;
      }
    };
  }, [toast]);

  const showToast = (message: string, tone: "success" | "error") => {
    setToast({ message, tone });
  };

  const handleSave = () => {
    const baseName = normalizeName(nameInput);
    if (!isValidName(baseName)) {
      showToast("Preset names must be 3-50 characters.", "error");
      return;
    }
    const uniqueName = getUniqueName(baseName, presets.map((preset) => preset.name));
    const saved = savePreset(uniqueName);
    if (!saved) {
      showToast("Unable to save preset.", "error");
      return;
    }
    setNameInput("");
    setSaveOpen(false);
    showToast(`Saved "${uniqueName}".`, "success");
  };

  const handleLoad = (id: string, name: string) => {
    loadPreset(id);
    showToast(`Loaded "${name}".`, "success");
    onPresetLoaded?.();
  };

  const handleRename = (id: string) => {
    const trimmed = normalizeName(editingName);
    if (!isValidName(trimmed)) {
      showToast("Preset names must be 3-50 characters.", "error");
      return;
    }
    const uniqueName = getUniqueName(
      trimmed,
      presets.filter((preset) => preset.id !== id).map((preset) => preset.name)
    );
    renamePreset(id, uniqueName);
    setEditingId(null);
    setEditingName("");
    showToast(`Renamed to "${uniqueName}".`, "success");
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deletePreset(deleteTarget.id);
    showToast(`Deleted "${deleteTarget.name}".`, "success");
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Presets</p>
          <h3 className="text-sm font-semibold">Saved Filters</h3>
        </div>
        <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Save Current</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save current filters</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Preset name</label>
              <Input
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder="e.g. Downtown Evening"
              />
              <p className="text-xs text-muted-foreground">3-50 characters. Duplicate names will be numbered.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {sortedPresets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          <p>No saved presets</p>
          <button
            onClick={() => setSaveOpen(true)}
            className="mt-2 text-sm font-medium text-foreground hover:underline"
          >
            Save current filters
          </button>
        </div>
      ) : (
        <ScrollArea className="max-h-64 pr-2">
          <div className="space-y-3">
            {sortedPresets.map((preset) => {
              const isEditing = editingId === preset.id;
              return (
                <div
                  key={preset.id}
                  className="rounded-lg border border-border bg-background/60 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <Input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") handleRename(preset.id);
                            if (event.key === "Escape") {
                              setEditingId(null);
                              setEditingName("");
                            }
                          }}
                        />
                      ) : (
                        <button
                          className="truncate text-left text-sm font-semibold hover:underline"
                          onDoubleClick={() => {
                            setEditingId(preset.id);
                            setEditingName(preset.name);
                          }}
                        >
                          {preset.name}
                        </button>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatPresetDate(preset.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <Button size="xs" onClick={() => handleRename(preset.id)}>
                          Save
                        </Button>
                      ) : (
                        <Button size="xs" variant="outline" onClick={() => handleLoad(preset.id, preset.name)}>
                          Load
                        </Button>
                      )}
                      <button
                        className="rounded-md border border-border p-1 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingId(preset.id);
                          setEditingName(preset.name);
                        }}
                        aria-label={`Rename ${preset.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="rounded-md border border-border p-1 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget({ id: preset.id, name: preset.name })}
                        aria-label={`Delete ${preset.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <Dialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete preset</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete &quot;{deleteTarget?.name}&quot;? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && (
        <div
          className={`rounded-md border px-3 py-2 text-xs shadow-sm ${
            toast.tone === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
