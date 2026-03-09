import { importShared } from './__federation_fn_import-BMdLx5XD.js';
import { j as jsxRuntimeExports, f as cn, g as buttonVariants, Q as QueryClient, a as QueryClientProvider, B as BrowserRouter, u as useAuthStore, A as AppNav, R as Routes, b as Route, C as CommitPage, c as CommitDetailPage, d as CommitHistoryPage, e as ManagerDashboard, N as Navigate } from './AppNav-Dka5CPh4.js';
import { r as reactDomExports } from './index-COvqqES_.js';

var client = {};

var m = reactDomExports;
{
  client.createRoot = m.createRoot;
  client.hydrateRoot = m.hydrateRoot;
}

function LoginPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen flex flex-col items-center justify-center gap-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: "Weekly Commit" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Plan your week, track your goals, stay aligned." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "a",
      {
        href: "http://localhost:8080/oauth2/authorization/oidc",
        className: cn(buttonVariants({ size: "lg" })),
        children: "Sign In"
      }
    )
  ] });
}

const {useEffect,useState} = await importShared('react');
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
  const { fetchUser, isLoading, user } = useAuthStore();
  const [hasFetched, setHasFetched] = useState(false);
  useEffect(() => {
    fetchUser().finally(() => setHasFetched(true));
  }, [fetchUser]);
  if (!hasFetched || isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen flex items-center justify-center text-muted-foreground", children: "Loading..." });
  }
  if (!user) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(LoginPage, {});
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(AppNav, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Routes, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/", element: /* @__PURE__ */ jsxRuntimeExports.jsx(RoleRouter, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/commits", element: /* @__PURE__ */ jsxRuntimeExports.jsx(CommitPage, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/commits/:id", element: /* @__PURE__ */ jsxRuntimeExports.jsx(CommitDetailPage, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/history", element: /* @__PURE__ */ jsxRuntimeExports.jsx(CommitHistoryPage, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/manager", element: /* @__PURE__ */ jsxRuntimeExports.jsx(ManagerDashboard, {}) })
    ] }) })
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
