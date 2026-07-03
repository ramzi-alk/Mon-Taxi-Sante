import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck } from "lucide-react";
import { supabase } from "~/lib/supabase";
import * as authRepository from "~/repositories/authRepository";
import * as adminNotificationsRepository from "~/repositories/adminNotificationsRepository";
import { useRealtime } from "~/hooks/useRealtime";
import { formatDateFr, formatTimeFr } from "~/lib/utils";
import { Dialog, DialogContent } from "~/components/ui/dialog";

const NOTIFICATIONS_QUERY_KEY = ["admin-notifications"];
const UNREAD_COUNT_QUERY_KEY = ["admin-notifications-unread-count"];

/**
 * Centre de notifications internes : signale aux admins des évènements qui
 * méritent leur attention (nouvelle candidature chauffeur, réservation
 * annulée, avis à faible note), quel qu'en soit l'auteur — distinct du
 * journal d'activité (/admin/journal), qui trace les actions FAITES par
 * les admins eux-mêmes.
 */
export function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: unreadCount } = useQuery({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: () => adminNotificationsRepository.fetchUnreadCount(supabase),
  });

  const { data: notifications, isLoading } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => adminNotificationsRepository.fetchNotifications(supabase),
    enabled: open,
  });

  useRealtime({ table: "admin_notifications", queryKey: UNREAD_COUNT_QUERY_KEY, event: "INSERT" });

  const { mutate: markRead } = useMutation({
    mutationFn: async (id: string) => {
      const user = await authRepository.getCurrentUser(supabase);
      if (!user) return;
      await adminNotificationsRepository.markNotificationRead(supabase, id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
    },
  });

  const { mutate: markAllRead, isPending: isMarkingAllRead } = useMutation({
    mutationFn: async () => {
      const user = await authRepository.getCurrentUser(supabase);
      if (!user) return;
      await adminNotificationsRepository.markAllNotificationsRead(supabase, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-[#0B0F1C] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {!!unreadCount && unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[15%] translate-y-0 max-w-md p-0 gap-0">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3.5">
            <p className="text-sm font-bold text-[#0B0F1C]">Notifications</p>
            {!!unreadCount && unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                disabled={isMarkingAllRead}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1244E8] hover:underline disabled:opacity-60"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {isLoading ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">Chargement…</p>
            ) : !notifications || notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">Aucune notification.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-lg px-3 py-2.5 ${n.read_at ? "" : "bg-brand-blue-50/50"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0B0F1C]">{n.title}</p>
                        {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-[11px] text-gray-400 mt-1">
                          {formatDateFr(n.created_at)} à {formatTimeFr(n.created_at)}
                        </p>
                      </div>
                      {!n.read_at && (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className="shrink-0 rounded-full bg-white p-1.5 text-gray-400 ring-1 ring-gray-200 hover:text-[#1244E8] hover:ring-brand-blue-200 transition-colors"
                          aria-label="Marquer comme lu"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
