'use client';

import { useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Share2, Check } from 'lucide-react';
import { useState } from 'react';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTES, Theme } from '@/lib/palettes';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useURLFeatureFlags } from '@/hooks/useURLFeatureFlags';
import { useFeatureFlagsStore } from '@/store/useFeatureFlagsStore';
import {
  FLAG_DEFINITIONS,
  getFlagsByCategory,
  type FeatureCategory,
} from '@/lib/feature-flags';
import { FeatureFlagItem } from './FeatureFlagItem';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { value: FeatureCategory; label: string }[] = [
  { value: 'visualization', label: 'Visualization' },
  { value: 'experimental', label: 'Experimental' },
  { value: 'accessibility', label: 'Accessibility' },
];

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const pendingFlags = useFeatureFlagsStore((state) => state.pendingFlags);
  const startEditing = useFeatureFlagsStore((state) => state.startEditing);
  const setPendingFlag = useFeatureFlagsStore((state) => state.setPendingFlag);
  const applyPendingFlags = useFeatureFlagsStore((state) => state.applyPendingFlags);
  const discardPendingFlags = useFeatureFlagsStore((state) => state.discardPendingFlags);
  const resetToDefaults = useFeatureFlagsStore((state) => state.resetToDefaults);
  const hasPendingChanges = useFeatureFlagsStore((state) => state.hasPendingChanges);
  const flags = useFeatureFlagsStore((state) => state.flags);

  // Start editing when panel opens
  useEffect(() => {
    if (isOpen) {
      startEditing();
    }
  }, [isOpen, startEditing]);

  const { copyShareURL } = useURLFeatureFlags();
  const [copied, setCopied] = useState(false);

  const handleCopyShare = async () => {
    // Share pending changes if any, otherwise committed flags
    const effectiveFlags = pendingFlags || flags;
    const success = await copyShareURL(effectiveFlags);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    discardPendingFlags();
    onClose();
  };

  const handleSave = () => {
    applyPendingFlags();
    onClose();
  };

  const handleReset = () => {
    resetToDefaults();
    onClose();
  };

  const getEffectiveValue = (flagId: string) => {
    if (pendingFlags !== null && flagId in pendingFlags) {
      return pendingFlags[flagId];
    }
    return flags[flagId] ?? false;
  };

  const hasChanges = hasPendingChanges();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-[400px] sm:w-[480px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Configure visualization features and experimental options.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-1 mb-6 space-y-2">
            <Label>Appearance</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
              <SelectTrigger>
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PALETTES).map(([key, palette]) => (
                  <SelectItem key={key} value={key}>
                    {palette.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="visualization" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              {CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value}>
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {CATEGORIES.map((cat) => (
              <TabsContent key={cat.value} value={cat.value} className="mt-4">
                {getFlagsByCategory(cat.value).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No features in this category yet.
                  </p>
                ) : (
                  getFlagsByCategory(cat.value).map((flag) => (
                    <FeatureFlagItem
                      key={flag.id}
                      flag={flag}
                      isEnabled={getEffectiveValue(flag.id)}
                      onToggle={(enabled) => setPendingFlag(flag.id, enabled)}
                    />
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <SheetFooter className="flex-col gap-3 sm:flex-col">
          {hasChanges && (
            <p className="text-sm text-amber-500 font-medium text-center">
              Unsaved changes - Save to apply
            </p>
          )}
          <div className="flex flex-col gap-2 w-full">
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                onClick={handleCopyShare}
                className="flex-1"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-1" />
                    Share URL
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Reset
              </Button>
            </div>
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className={hasChanges ? 'flex-1 bg-amber-500 hover:bg-amber-600' : 'flex-1'}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
