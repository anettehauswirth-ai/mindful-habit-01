import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Lotus } from "./Lotus";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const tabs = [
  { to: "/", label: "Practice" },
  { to: "/calendar", label: "Dashboard" },
  { to: "/history", label: "History" },
] as const;

export function AppShell() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  const isAuthRoute = loc.pathname === "/auth";

  useEffect(() => {
    if (!loading && !user && !isAuthRoute) {
      navigate({ to: "/auth" });
    }
  }, [user, loading, isAuthRoute, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Decorative lotuses */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-20 opacity-[0.07] animate-float">
          <Lotus size={340} />
        </div>
        <div
          className="absolute top-1/3 -right-24 opacity-[0.06] animate-float"
          style={{ animationDelay: "2s" }}
        >
          <Lotus size={420} />
        </div>
        <div
          className="absolute -bottom-24 left-1/4 opacity-[0.05] animate-float"
          style={{ animationDelay: "4s" }}
        >
          <Lotus size={380} />
        </div>
      </div>

      {isAuthRoute ? (
        <Outlet />
      ) : !user ? (
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <Lotus size={48} glow />
        </div>
      ) : (
        <div className="relative z-10 mx-auto max-w-3xl px-5 py-10 sm:py-14">
          <header className="text-center mb-10 relative">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Lotus size={44} glow />
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gold">
                Stillness
              </h1>
              <Lotus size={44} glow />
            </div>
            <p className="text-sm text-muted-foreground italic">
              A quiet space for your daily practice
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth" });
              }}
              className="absolute top-0 right-0 text-muted-foreground hover:text-foreground"
              title={user.email ?? "Sign out"}
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Sign out</span>
            </Button>
          </header>

          <nav className="glass rounded-full p-1.5 flex items-center justify-between mb-10 shadow-soft">
            {tabs.map((t) => {
              const active =
                t.to === "/"
                  ? loc.pathname === "/"
                  : loc.pathname.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`flex-1 text-center text-xs sm:text-sm py-2.5 px-3 rounded-full transition-all ${
                    active
                      ? "gradient-gold text-primary-foreground shadow-glow font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>

          <main>
            <Outlet />
          </main>

          <footer className="mt-16 text-center text-xs text-muted-foreground/70">
            Breathe in. Breathe out.
          </footer>
        </div>
      )}
    </div>
  );
}
