import type { Preview } from '@storybook/nextjs-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import '../src/app/globals.css'
import { OverlayProvider } from '../src/components/providers/OverlayProvider'

const queryClient = new QueryClient()

const preview: Preview = {
  decorators: [
    (Story) => React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(Story),
      React.createElement(OverlayProvider),
    ),
  ],
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;