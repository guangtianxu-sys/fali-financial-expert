import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import Home from "./pages/Home";
import Transactions from "./pages/Transactions";
import Settlement from "./pages/Settlement";
import Assets from "./pages/Assets";
import SettingsPage from "./pages/SettingsPage";
import AuthPage from "./pages/AuthPage";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Redirect to="/auth" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">{() => <ProtectedRoute component={Home} />}</Route>
      <Route path="/transactions">{() => <ProtectedRoute component={Transactions} />}</Route>
      <Route path="/settlement">{() => <ProtectedRoute component={Settlement} />}</Route>
      <Route path="/assets">{() => <ProtectedRoute component={Assets} />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={SettingsPage} />}</Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
