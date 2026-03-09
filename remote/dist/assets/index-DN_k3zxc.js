import { importShared } from './__federation_fn_import-BMdLx5XD.js';
import { Q as QueryClient, j as jsxRuntimeExports, a as QueryClientProvider, B as BrowserRouter, u as useAuthStore, R as Routes, b as Route, C as CommitPage, c as CommitDetailPage, M as ManagerDashboard, N as Navigate } from './CommitDetailPage-B2nLwFsK.js';
import { r as reactDomExports } from './index-COvqqES_.js';

var client = {};

var m = reactDomExports;
{
  client.createRoot = m.createRoot;
  client.hydrateRoot = m.hydrateRoot;
}

const {useEffect} = await importShared('react');
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 3e4
    }
  }
});
function RoleRouter() {
  const { user } = useAuthStore();
  if (!user) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Loading..." });
  const isManager = user.roles.includes("MANAGER") || user.roles.includes("DUAL_ROLE");
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: isManager ? "/manager" : "/commits", replace: true });
}
function AppRoutes() {
  const { fetchUser, isLoading } = useAuthStore();
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen flex items-center justify-center text-muted-foreground", children: "Loading..." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Routes, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/", element: /* @__PURE__ */ jsxRuntimeExports.jsx(RoleRouter, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/commits", element: /* @__PURE__ */ jsxRuntimeExports.jsx(CommitPage, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/commits/:id", element: /* @__PURE__ */ jsxRuntimeExports.jsx(CommitDetailPage, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/manager", element: /* @__PURE__ */ jsxRuntimeExports.jsx(ManagerDashboard, {}) })
  ] });
}
function App() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsxRuntimeExports.jsx(BrowserRouter, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(AppRoutes, {}) }) });
}

const React = await importShared('react');
const rootElement = document.getElementById("root");
if (rootElement) {
  client.createRoot(rootElement).render(
    /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
  );
}
