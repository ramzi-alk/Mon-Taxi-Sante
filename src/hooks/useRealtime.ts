import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "~/lib/supabase";

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeOptions {
  table: string;
  queryKey: unknown[];
  event?: RealtimeEvent;
  filter?: string;
}

/**
 * Subscribe to Supabase Realtime changes on a table.
 * Automatically invalidates the given TanStack Query queryKey on change.
 */
export function useRealtime({
  table,
  queryKey,
  event = "*",
  filter,
}: UseRealtimeOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channelName = `realtime:${table}:${event}:${filter ?? "all"}`;

    const channel = supabase
      .channel(channelName)
      .on(
        // @ts-expect-error — supabase types are overly strict here
        "postgres_changes",
        {
          event,
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, filter, queryKey, queryClient]);
}
