import type { Preview } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import "../src/app/globals.css";
import { OverlayProvider } from "../src/components/providers/OverlayProvider";

const queryClient = new QueryClient();

const preview: Preview = {
  decorators: [
    (Story) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(Story),
        React.createElement(OverlayProvider)
      )
  ],
  parameters: {
    nextjs: {
      appDirectory: true
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    a11y: {
      test: "todo"
    }
  }
};

export default preview;
