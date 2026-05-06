"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ActionConfig } from "@/types/widget";
import { useRouter } from "next/navigation";
import { useOverlayStore } from "@/hooks/useOverlayStore";
import { useWidgetState } from "@/hooks/useWidgetState";

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
        let errorMessage = `Action failed: ${res.statusText}`;
        try {
          const text = await res.text();
          if (text) {
            const errorData = JSON.parse(text);
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            }
          }
        } catch (e) {
          // Ignore JSON parsing errors for error responses
        }
        throw new Error(errorMessage);
      }
      if (res.status === 204) return null;
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }
  });

  return async (action: ActionConfig, rowData?: Record<string, unknown>) => {
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
          await mutateAsync(action);
          if (action.successMessage) {
            console.log("Success Toast:", action.successMessage); // Placeholder for toast
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
};
