import type { Preview } from "@storybook/nextjs-vite";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../src/app/globals.css";

const preview: Preview = {
  decorators: [
    (Story) =>
      React.createElement(
        QueryClientProvider,
        {
          client: new QueryClient({
            defaultOptions: { queries: { retry: false, staleTime: Infinity } }
          })
        },
        React.createElement(Story)
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
