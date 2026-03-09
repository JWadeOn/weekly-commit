import { importShared } from './__federation_fn_import-BMdLx5XD.js';
import { Q as QueryClient, j as jsxRuntimeExports, a as QueryClientProvider, M as MemoryRouter, u as useAuthStore, s as setAuthExpiredHandler, A as AppNav, R as Routes, b as Route, C as CommitPage, c as CommitDetailPage, d as CommitHistoryPage, e as ManagerDashboard, N as Navigate } from './AppNav-Dka5CPh4.js';

const {useEffect} = await importShared('react');
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 3e4
    }
  }
});
function RoleRedirect() {
  const { user } = useAuthStore();
  console.log("[WeeklyCommitApp] RoleRedirect — user:", user?.roles);
  if (!user) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Loading..." });
  const isManager = user.roles.includes("MANAGER") || user.roles.includes("DUAL_ROLE");
  const target = isManager ? "/manager" : "/commits";
  console.log("[WeeklyCommitApp] RoleRedirect — navigating to:", target);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: target, replace: true });
}
function AppContent({ onAuthExpired }) {
  const { fetchUser, isLoading, user } = useAuthStore();
  useEffect(() => {
    console.log("[WeeklyCommitApp] AppContent mounted — calling fetchUser");
    setAuthExpiredHandler(onAuthExpired);
    fetchUser();
  }, [fetchUser, onAuthExpired]);
  console.log("[WeeklyCommitApp] AppContent render — isLoading:", isLoading, "user:", user?.email ?? null);
  if (isLoading || !user && !isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen flex items-center justify-center text-muted-foreground", children: "Loading..." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(AppNav, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Routes, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/", element: /* @__PURE__ */ jsxRuntimeExports.jsx(RoleRedirect, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/commits", element: /* @__PURE__ */ jsxRuntimeExports.jsx(CommitPage, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/commits/:id", element: /* @__PURE__ */ jsxRuntimeExports.jsx(CommitDetailPage, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/history", element: /* @__PURE__ */ jsxRuntimeExports.jsx(CommitHistoryPage, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/manager", element: /* @__PURE__ */ jsxRuntimeExports.jsx(ManagerDashboard, {}) })
    ] }) })
  ] });
}
function WeeklyCommitApp({ onAuthExpired }) {
  console.log("[WeeklyCommitApp] root render");
  return /* @__PURE__ */ jsxRuntimeExports.jsx(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsxRuntimeExports.jsx(MemoryRouter, { initialEntries: ["/"], initialIndex: 0, children: /* @__PURE__ */ jsxRuntimeExports.jsx(AppContent, { onAuthExpired }) }) });
}

export { WeeklyCommitApp as default };
