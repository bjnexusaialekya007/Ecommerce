import React, { useEffect, useMemo } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  redirect,
  RouterProvider,
  useRouteError,
} from 'react-router-dom';
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';
import type { ClientConfig, ResolvedConfigResult } from './config';
import { ExperienceProvider } from './experience';
import { StoreProvider } from './stores/appContext';
import { useAuthStore } from './stores/auth';
import { useCartStore } from './stores/cart';
import { captureFirstTouchAttribution } from './analytics/track';
import { CustomerLayout } from './components/layout/CustomerLayout';

// Primary landing route (eager for instant LCP)
import { HomePage } from './routes/customer/HomePage';

function RootExperienceShell({ config }: { config: ClientConfig }) {
  return (
    <ExperienceProvider config={config}>
      <Outlet />
    </ExperienceProvider>
  );
}

function RouteErrorFallback() {
  const err = useRouteError() as Error | undefined;
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
      <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Something went wrong</h1>
      <p className="text-sm text-[var(--ink-muted)]">{err?.message || 'An unexpected display error occurred.'}</p>
      <a
        href="/"
        className="pressable inline-flex min-h-[44px] items-center rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-5 text-sm font-semibold text-white transition-colors"
      >
        Reload Storefront
      </a>
    </div>
  );
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
          <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Storefront Error</h1>
          <p className="text-sm text-[var(--ink-muted)]">{this.state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="pressable min-h-[44px] rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-5 text-sm font-semibold text-white transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App({ resolved }: { resolved: ResolvedConfigResult }) {
  const { config, isDemo } = resolved;

  useEffect(() => {
    captureFirstTouchAttribution(window.location.search);
  }, []);

  const router = useMemo(() => {
    const maintenanceLoader = () => {
      if (config.maintenance) throw redirect('/maintenance');
      return null;
    };

    const cartNotEmptyLoader = () => {
      if (config.maintenance) throw redirect('/maintenance');
      if (useCartStore.getState().lines.length === 0) throw redirect('/cart');
      return null;
    };

    const requireAdminLoader = () => {
      if (!useAuthStore.getState().adminEmail) throw redirect('/admin/login');
      return null;
    };

    const requireBuyerLoader = () => {
      if (!useAuthStore.getState().buyer) throw redirect('/wholesale/login');
      return null;
    };

    const guestOnlyLoader = () => {
      if (useAuthStore.getState().buyer) throw redirect('/account');
      return null;
    };

    const devEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV !== '0';
    const devRoutes = devEnabled
      ? [
          { path: '/dev/styleguide', lazy: async () => ({ Component: (await import('./routes/dev/DevInspectors')).StyleguidePage }) },
          { path: '/dev/sim', lazy: async () => ({ Component: (await import('./routes/dev/DevInspectors')).SimPage }) },
          { path: '/dev/outbox', lazy: async () => ({ Component: (await import('./routes/dev/DevInspectors')).OutboxPage }) },
          { path: '/dev/seo', lazy: async () => ({ Component: (await import('./routes/dev/DevInspectors')).SeoInspectorPage }) },
          { path: '/dev/analytics', lazy: async () => ({ Component: (await import('./routes/dev/DevInspectors')).AnalyticsPage }) },
          { path: '/dev/quote-cases', lazy: async () => ({ Component: (await import('./routes/dev/DevInspectors')).QuoteCasesPage }) },
          { path: '/dev/experience', lazy: async () => ({ Component: (await import('./routes/dev/DevInspectors')).ExperienceInspectorPage }) },
          { path: '/dev/checks', lazy: async () => ({ Component: (await import('./routes/dev/ChecksPage')).ChecksPage }) },
        ]
      : [];

    return createBrowserRouter([
      {
        element: <RootExperienceShell config={config} />,
        errorElement: <RouteErrorFallback />,
        children: [
          {
            element: <CustomerLayout />,
            errorElement: <RouteErrorFallback />,
            children: [
              { path: '/', loader: maintenanceLoader, element: <HomePage /> },
              { path: '/shop', loader: maintenanceLoader, lazy: async () => ({ Component: (await import('./routes/customer/ShopPage')).ShopPage }) },
              { path: '/c/:slug', loader: maintenanceLoader, lazy: async () => ({ Component: (await import('./routes/customer/CategoryPage')).CategoryPage }) },
              { path: '/p/:slug', loader: maintenanceLoader, lazy: async () => ({ Component: (await import('./routes/customer/ProductPage')).ProductPage }) },
              { path: '/cart', loader: maintenanceLoader, lazy: async () => ({ Component: (await import('./routes/customer/CartPage')).CartPage }) },
              { path: '/checkout', loader: cartNotEmptyLoader, lazy: async () => ({ Component: (await import('./routes/customer/CheckoutPage')).CheckoutPage }) },
              { path: '/order/:code', lazy: async () => ({ Component: (await import('./routes/customer/OrderStatusPage')).OrderStatusPage }) },
              { path: '/track', lazy: async () => ({ Component: (await import('./routes/customer/TrackPage')).TrackPage }) },
              { path: '/invoice/:code', lazy: async () => ({ Component: (await import('./routes/customer/InvoicePage')).InvoicePage }) },
              { path: '/wholesale', loader: maintenanceLoader, lazy: async () => ({ Component: (await import('./routes/customer/WholesalePages')).WholesaleOverviewPage }) },
              { path: '/wholesale/register', loader: guestOnlyLoader, lazy: async () => ({ Component: (await import('./routes/customer/WholesalePages')).WholesaleRegisterPage }) },
              { path: '/wholesale/login', loader: guestOnlyLoader, lazy: async () => ({ Component: (await import('./routes/customer/WholesalePages')).WholesaleLoginPage }) },
              { path: '/wholesale/quote', loader: maintenanceLoader, lazy: async () => ({ Component: (await import('./routes/customer/WholesalePages')).WholesaleQuotePage }) },
              { path: '/account', loader: requireBuyerLoader, lazy: async () => ({ Component: (await import('./routes/customer/WholesalePages')).WholesaleAccountPage }) },
              { path: '/about', lazy: async () => ({ Component: (await import('./routes/customer/InfoPages')).AboutPage }) },
              { path: '/contact', lazy: async () => ({ Component: (await import('./routes/customer/InfoPages')).ContactPage }) },
              { path: '/faq', lazy: async () => ({ Component: (await import('./routes/customer/InfoPages')).FaqPage }) },
              { path: '/policies', element: <Navigate to="/policies/privacy" replace /> },
              { path: '/policies/:type', lazy: async () => ({ Component: (await import('./routes/customer/InfoPages')).PolicyPage }) },
              { path: '/busy', lazy: async () => ({ Component: (await import('./routes/customer/InfoPages')).BusyPage }) },
              { path: '/maintenance', lazy: async () => ({ Component: (await import('./routes/customer/InfoPages')).MaintenancePage }) },
              { path: '/offline', lazy: async () => ({ Component: (await import('./routes/customer/InfoPages')).OfflinePage }) },
              ...devRoutes,
              { path: '*', lazy: async () => ({ Component: (await import('./routes/customer/InfoPages')).NotFoundPage }) },
            ],
          },
          {
            path: '/admin/login',
            errorElement: <RouteErrorFallback />,
            lazy: async () => ({ Component: (await import('./routes/admin/AdminLoginPage')).AdminLoginPage }),
          },
          {
            path: '/admin',
            lazy: async () => ({ Component: (await import('./components/layout/AdminLayout')).AdminLayout }),
            loader: requireAdminLoader,
            errorElement: <RouteErrorFallback />,
            children: [
              { index: true, lazy: async () => ({ Component: (await import('./routes/admin/AdminDashboardPage')).AdminDashboardPage }) },
              { path: 'orders', lazy: async () => ({ Component: (await import('./routes/admin/AdminOrdersPage')).AdminOrdersPage }) },
              { path: 'orders/:id', lazy: async () => ({ Component: (await import('./routes/admin/AdminOrdersPage')).AdminOrderDetailPage }) },
              { path: 'products', lazy: async () => ({ Component: (await import('./routes/admin/AdminProductsPage')).AdminProductsPage }) },
              { path: 'products/:id', lazy: async () => ({ Component: (await import('./routes/admin/AdminProductsPage')).AdminProductEditPage }) },
              { path: 'import', lazy: async () => ({ Component: (await import('./routes/admin/AdminImportPage')).AdminImportPage }) },
              { path: 'wholesale/buyers', lazy: async () => ({ Component: (await import('./routes/admin/AdminWholesalePages')).AdminWholesaleBuyersPage }) },
              { path: 'wholesale/quotes', lazy: async () => ({ Component: (await import('./routes/admin/AdminWholesalePages')).AdminWholesaleQuotesPage }) },
              { path: 'shipping', lazy: async () => ({ Component: (await import('./routes/admin/AdminConfigPages')).AdminShippingPage }) },
              { path: 'zones', lazy: async () => ({ Component: (await import('./routes/admin/AdminConfigPages')).AdminZonesPage }) },
              { path: 'coupons', lazy: async () => ({ Component: (await import('./routes/admin/AdminConfigPages')).AdminCouponsPage }) },
              { path: 'reports', lazy: async () => ({ Component: (await import('./routes/admin/AdminConfigPages')).AdminReportsPage }) },
              { path: 'audit', lazy: async () => ({ Component: (await import('./routes/admin/AdminConfigPages')).AdminAuditPage }) },
              { path: 'settings', lazy: async () => ({ Component: (await import('./routes/admin/AdminConfigPages')).AdminSettingsPage }) },
            ],
          },
        ],
      },
    ]);
  }, [config]);

  return (
    <AppErrorBoundary>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={domAnimation}>
          <StoreProvider initialConfig={config} isDemo={isDemo}>
            <RouterProvider router={router} />
          </StoreProvider>
        </LazyMotion>
      </MotionConfig>
    </AppErrorBoundary>
  );
}
