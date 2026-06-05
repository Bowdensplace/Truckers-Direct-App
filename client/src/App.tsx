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

            {/* Protected routes — flat list so wouter matches sub-paths correctly */}
            <Route path="/clients/:clientId/periods/:periodId/:workflow">
              {(params) => (
                <ProtectedRoute>
                  <Layout>
                    <WorkflowPage />
                  </Layout>
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/clients/:clientId">
              {(params) => (
                <ProtectedRoute>
                  <Layout>
                    <ClientDetail />
                  </Layout>
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/search">
              <ProtectedRoute>
                <Layout>
                  <SearchPage />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/">
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route>
              <ProtectedRoute>
                <Layout>
                  <NotFound />
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
