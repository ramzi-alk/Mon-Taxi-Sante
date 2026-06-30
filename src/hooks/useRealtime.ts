import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "~/lib/supabase";

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface RealtimePayload {
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

interface UseRealtimeOptions {
  table: string;
  queryKey: unknown[];
  event?: RealtimeEvent;
  filter?: string;
  onChange?: (payload: RealtimePayload) => void;
  enabled?: boolean;
}

/**
 * Subscribe to Supabase Realtime changes on a table.
 * Automatically invalidates the given TanStack Query queryKey on change,
 * and optionally calls onChange with the raw payload (e.g. to surface a
 * notification before the refetched data lands).
 */
export function useRealtime({
  table,
  queryKey,
  event = "*",
  filter,
  onChange,
  enabled = true,
}: UseRealtimeOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;
    const channelName = `realtime:${table}:${event}:${filter ?? "all"}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event,
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        (payload: RealtimePayload) => {
          onChangeRef.current?.(payload);
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, filter, queryKey, queryClient, enabled]);
}
