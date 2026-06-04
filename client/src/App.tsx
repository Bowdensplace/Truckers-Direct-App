import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import ClientDetail from "@/pages/ClientDetail";
import WorkflowPage from "@/pages/WorkflowPage";
import SearchPage from "@/pages/SearchPage";
import LoginPage from "@/pages/LoginPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router hook={useHashLocation}>
          <Switch>
            {/* Public route — login */}
            <Route path="/login" component={LoginPage} />

            {/* Protected routes — require Google auth */}
            <Route path="/">
              <ProtectedRoute>
                <Layout>
                  <Switch>
                    <Route path="/" component={Dashboard} />
                    <Route path="/clients/:clientId" component={ClientDetail} />
                    <Route path="/clients/:clientId/periods/:periodId/:workflow" component={WorkflowPage} />
                    <Route path="/search" component={SearchPage} />
                    <Route component={NotFound} />
                  </Switch>
                </Layout>
              </ProtectedRoute>
            </Route>
          </Switch>
        </Router>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
