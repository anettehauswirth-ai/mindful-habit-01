import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/hooks/use-auth";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Stillness — Mindfulness Habit Tracker" },
      { name: "description", content: "An elegant daily mindfulness practice tracker." },
      { name: "author", content: "Stillness" },
      { property: "og:title", content: "Stillness — Mindfulness Habit Tracker" },
      { property: "og:description", content: "An elegant daily mindfulness practice tracker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <AppShell />
      <Toaster />
    </AuthProvider>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass rounded-3xl p-10">
        <h1 className="text-7xl font-bold text-gold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Lost in stillness</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page does not exist.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md gradient-gold px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Return home
        </a>
      </div>
    </div>
  );
}
