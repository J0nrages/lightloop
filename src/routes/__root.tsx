import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ClerkProvider } from '@clerk/tanstack-react-start'
import { CopilotKit } from "@copilotkit/react-core";
import Header from '../components/Header'
import appCss from '../styles.css?url'
import 'geist/font/sans'
import 'geist/font/mono'
import "@copilotkit/react-ui/styles.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Lightloop - Generative UI Chat',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: 'hsl(222.2 47.4% 11.2%)',
          borderRadius: '0.5rem',
        },
      }}
    >
      <CopilotKit runtimeUrl="http://localhost:4111/chat" agent="hiringAgent">
        <html lang="en" className="h-full">
          <head>
            <HeadContent />
          </head>
          <body className="h-full font-sans antialiased bg-background text-foreground overflow-hidden">
            <div className="relative flex flex-col h-full">
              <Header />
              <main className="flex-1 overflow-hidden relative">
                {children}
              </main>
            </div>
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
            <Scripts />
          </body>
        </html>
      </CopilotKit>
    </ClerkProvider>
  )
}
