import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getUserSettings,
  updateUserSettings,
} from "@/services/user-settings.service";
import type {
  UpdateUserSettingsInput,
  UserSettings,
} from "@/types/user-settings";

const getPatch = (
  initial: UserSettings | null,
  draft: UserSettings | null,
): UpdateUserSettingsInput => {
  if (!initial || !draft) return {};

  return (Object.keys(draft) as Array<keyof UserSettings>).reduce(
    (patch, key) => {
      if (draft[key] !== initial[key]) {
        return { ...patch, [key]: draft[key] };
      }
      return patch;
    },
    {} as UpdateUserSettingsInput,
  );
};

export const useUserSettings = () => {
  const [initial, setInitial] = useState<UserSettings | null>(null);
  const [draft, setDraft] = useState<UserSettings | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const settings = await getUserSettings();
      setInitial(settings);
      setDraft(settings);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải cài đặt tài khoản.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = useMemo(() => getPatch(initial, draft), [draft, initial]);
  const isDirty = Object.keys(patch).length > 0;

  const setValue = useCallback(
    <Key extends keyof UserSettings>(key: Key, value: UserSettings[Key]) => {
      setDraft((current) => (current ? { ...current, [key]: value } : current));
    },
    [],
  );

  const save = useCallback(async () => {
    if (!draft || !isDirty || isSaving) return null;
    setIsSaving(true);
    try {
      const responsePatch = await updateUserSettings(patch);
      const saved: UserSettings = {
        ...draft,
        ...patch,
        ...responsePatch,
      };
      setInitial(saved);
      setDraft(saved);
      return saved;
    } finally {
      setIsSaving(false);
    }
  }, [draft, isDirty, isSaving, patch]);

  return {
    draft,
    error,
    isDirty,
    isLoading,
    isSaving,
    load,
    save,
    setValue,
  };
};
