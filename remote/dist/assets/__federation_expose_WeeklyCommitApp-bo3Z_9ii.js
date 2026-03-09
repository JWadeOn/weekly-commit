import { importShared } from './__federation_fn_import-BMdLx5XD.js';
import { Q as QueryClient, j as jsxRuntimeExports, a as QueryClientProvider, B as BrowserRouter, u as useAuthStore, s as setAuthExpiredHandler, R as Routes, b as Route, C as CommitPage, c as CommitDetailPage, M as ManagerDashboard, N as Navigate } from './CommitDetailPage-B2nLwFsK.js';

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
  if (!user) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Loading..." });
  const isManager = user.roles.includes("MANAGER") || user.roles.includes("DUAL_ROLE");
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: isManager ? "/manager" : "/commits", replace: true });
}
function AppContent({ onAuthExpired }) {
  const { fetchUser, isLoading } = useAuthStore();
  useEffect(() => {
    setAuthExpiredHandler(onAuthExpired);
    fetchUser();
  }, [fetchUser, onAuthExpired]);
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen flex items-center justify-center text-muted-foreground", children: "Loading..." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Routes, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/", element: /* @__PURE__ */ jsxRuntimeExports.jsx(RoleRedirect, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/commits", element: /* @__PURE__ */ jsxRuntimeExports.jsx(CommitPage, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/commits/:id", element: /* @__PURE__ */ jsxRuntimeExports.jsx(CommitDetailPage, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/manager", element: /* @__PURE__ */ jsxRuntimeExports.jsx(ManagerDashboard, {}) })
  ] });
}
function WeeklyCommitApp({ onAuthExpired }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsxRuntimeExports.jsx(BrowserRouter, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(AppContent, { onAuthExpired }) }) });
}

export { WeeklyCommitApp as default };
