"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ActionConfig } from "@/types/widget";
import { useRouter } from "next/navigation";
import { useOverlayStore } from "@/hooks/useOverlayStore";
import { useWidgetState } from "@/hooks/useWidgetState";
import { toast } from "@/components/ui/toast";

export const useActionHandler = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { open, close } = useOverlayStore();
  const { setValue, patchValue, getValue } = useWidgetState();

  const { mutateAsync } = useMutation({
    mutationFn: async (action: ActionConfig) => {
      if (action.type !== "api-mutation" || !action.api) return;
      const res = await fetch(action.api.endpoint, {
        method: action.api.method,
        body: JSON.stringify(action.api.body),
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) {
        // Backend uses two error envelopes — the V1-default Spring shape
        //   { timestamp, status, error, message, path }
        // and the QuotationException shape
        //   { timestamp, status, error, errorCode, message, path }
        // Both expose `message` as the human-readable reason. Fall back to
        // `error` (HTTP-status text) and `errorCode` (machine code) when
        // `message` is missing. See src/lib/api/error-mapper.ts.
        let errorMessage = `Action failed: ${res.statusText}`;
        try {
          const text = await res.text();
          if (text) {
            const errorData = JSON.parse(text);
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.errorCode) {
              errorMessage = errorData.errorCode;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            }
          }
        } catch {
          // Body wasn't JSON — keep the statusText fallback.
        }
        throw new Error(errorMessage);
      }
      if (res.status === 204) return null;
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }
  });

  const dispatch = async (action: ActionConfig, rowData?: Record<string, unknown>): Promise<void> => {
    switch (action.type) {
      case "navigate":
        if (action.target) router.push(action.target);
        break;
      case "api-mutation":
        if (action.api) {
          if (action.confirm) {
            // For API Mutations with confirmations, we will pop a confirmation dialog first
            // which then executes this mutation upon approval.
            open(`confirm-${action.id}`, "dialog", action);
            return;
          }
          try {
            await mutateAsync(action);
            if (action.successMessage) {
              toast.success(action.successMessage);
            }
            if (action.refreshKey) {
              // Invalidate any query whose first queryKey element starts with the action.refreshKey
              const refreshKeyStr = action.refreshKey;
              queryClient.invalidateQueries({
                predicate: (query) => {
                  const key = query.queryKey[0];
                  return typeof key === "string" && key.startsWith(refreshKeyStr);
                }
              });
            }
            if (action.onSuccess?.length) {
              for (const next of action.onSuccess) {
                await dispatch(next, rowData);
              }
            }
          } catch (err) {
            // Surface the parsed `message` from the backend's error envelope
            // (or the raw Error message when parsing fell back to statusText).
            // Toast is the user-facing surface; we deliberately do NOT rethrow
            // so callers (ActionBar, form-container, ConfirmationDialog, etc.)
            // can fire-and-forget without each adding their own try/catch +
            // creating an unhandled-promise-rejection on every API failure.
            // If a future caller genuinely needs to react to failure, return a
            // boolean / status object from dispatch — don't reintroduce throw.
            const message =
              err instanceof Error && err.message
                ? err.message
                : "Action failed";
            toast.error(message);
          }
        }
        break;
      case "open-modal":
        if (action.target) open(action.target, "modal", rowData);
        break;
      case "open-sheet":
        if (action.target) open(action.target, "sheet", rowData);
        break;
      case "api-download":
        if (action.api) {
          try {
            const res = await fetch(action.api.endpoint, {
              method: action.api.method,
              body: action.api.method !== "GET" ? JSON.stringify(action.api.body) : undefined,
              headers: {
                "Content-Type": "application/json"
              }
            });
            if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = action.filename || "download";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
          } catch (error) {
            const message = error instanceof Error && error.message
              ? error.message
              : "Download failed";
            toast.error(message);
            console.error("Download error:", error);
          }
        }
        break;
      case "trigger-event":
        close(action.target);
        break;
      case "update-widget-state":
        if (action.props) {
          const { key, operation, value } = action.props;
          switch (operation) {
            case "set":
              setValue(key, value);
              break;
            case "patch":
              patchValue(key, value);
              break;
            case "toggle":
              setValue(key, !getValue(key));
              break;
          }
        }
        break;
    }
  };

  return dispatch;
};
