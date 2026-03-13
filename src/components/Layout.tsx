import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/hooks/useDemo";
import { useTheme } from "@/hooks/useTheme";
import { useMentorName } from "@/hooks/useMentorName";
import { Sun, Moon, LogOut, Zap, BarChart3, Clock, Settings, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Layout = ({ children }: { children: ReactNode }) => {
  const { signOut } = useAuth();
  const { isDemo, disableDemo } = useDemo();
  const { theme, toggleTheme } = useTheme();
  const { mentorName } = useMentorName();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/dashboard", label: "Today", icon: Zap },
    { path: "/progress", label: "Progress", icon: BarChart3 },
    { path: "/history", label: "History", icon: Clock },
    { path: "/settings", label: "Settings", icon: Settings },
    { path: "/mentor", label: mentorName, icon: MessageSquare },
  ];

  const handleSignOut = () => {
    if (isDemo) {
      disableDemo();
      navigate("/auth");
    } else {
      signOut();
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src="/Fork.png" className="h-5 w-5" />
            <span className="font-serif text-lg font-bold tracking-tight">DailyProng</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button variant={location.pathname === item.path ? "secondary" : "ghost"} size="sm" className="gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm md:hidden">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button variant="ghost" size="sm" className={`flex-col gap-0.5 h-auto py-1.5 px-2 ${location.pathname === item.path ? "text-accent" : "text-muted-foreground"}`}>
                <item.icon className="h-4 w-4" />
                <span className="text-[10px] truncate max-w-[48px]">{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </nav>

      <main className="container pb-20 md:pb-8 pt-6">
        {children}
      </main>

      <footer className="border-t border-border py-4 text-center pb-20 md:pb-4">
        <Link to="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          About DailyProng
        </Link>
      </footer>
    </div>
  );
};