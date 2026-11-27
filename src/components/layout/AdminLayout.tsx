import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Upload,
  Briefcase,
  FileSpreadsheet,
  Truck,
  MapPin,
  TicketPercent,
  BarChart3,
  History,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { api } from '../../api';
import { useAuthStore } from '../../stores/auth';
import { useStore } from '../../stores/appContext';
import { ToastContainer } from '../ui/Toast';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/products', label: 'Products & SKUs', icon: Package },
  { to: '/admin/import', label: 'CSV Import', icon: Upload },
  { to: '/admin/wholesale/buyers', label: 'Wholesale Buyers', icon: Briefcase },
  { to: '/admin/wholesale/quotes', label: 'Quote Requests', icon: FileSpreadsheet },
  { to: '/admin/shipping', label: 'Shipping Slabs', icon: Truck },
  { to: '/admin/zones', label: 'Local Zones', icon: MapPin },
  { to: '/admin/coupons', label: 'Coupons', icon: TicketPercent },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/audit', label: 'Audit & Price Log', icon: History },
  { to: '/admin/settings', label: 'Settings & Backup', icon: Settings },
];

export function AdminLayout() {
  const { config, refreshConfig } = useStore();
  const adminEmail = useAuthStore((s) => s.adminEmail);
  const setAdminEmail = useAuthStore((s) => s.setAdminEmail);
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await api.logout('admin');
    setAdminEmail(null);
    navigate('/admin/login');
  };

  const toggleStatus = async (status: 'open' | 'busy' | 'closed') => {
    await api.adminSetShopSwitch(status, status === 'busy' ? 30 : undefined);
    await refreshConfig();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-4 space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-base font-bold text-[var(--primary)]">{config.brand.shortName} Admin</p>
            <p className="text-xs text-[var(--ink-muted)] truncate max-w-[180px]">{adminEmail}</p>
          </div>
          <Link to="/" className="text-xs font-semibold text-[var(--primary)] hover:underline whitespace-nowrap">
            Storefront
          </Link>
        </div>

        <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1">
          {(['open', 'busy', 'closed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-colors ${
                config.manualShopStatus === s
                  ? s === 'closed'
                    ? 'bg-[var(--danger)] text-white'
                    : s === 'busy'
                    ? 'bg-[var(--warn-bg)] text-[var(--warn-ink)]'
                    : 'bg-[var(--success)] text-white'
                  : 'text-[var(--ink-muted)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <nav aria-label="Admin navigation" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-[42px] items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--primary)] text-white shadow-[var(--sh-1)]'
                      : 'text-[var(--ink)] hover:bg-[var(--surface-2)]'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="flex min-h-[44px] w-full items-center gap-2 rounded-xl border border-[var(--border-soft)] px-3 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger-bg)]"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span>Sign out</span>
      </button>
    </div>
  );

  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <div className="min-h-dvh bg-[var(--bg)] font-sans text-[var(--ink)] flex flex-col lg:flex-row">
        {/* Desktop Sidebar */}
        <aside className="no-print hidden lg:block w-64 shrink-0 border-r border-[var(--border-soft)] bg-[var(--surface)] sticky top-0 h-dvh overflow-y-auto">
          {sidebarContent}
        </aside>

        {/* Mobile Admin Header */}
        <header className="no-print lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--surface)] px-4 h-14">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open admin menu"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="font-display font-bold text-base text-[var(--primary)]">{config.brand.shortName} Ops</span>
          </div>
          <Link to="/" className="text-xs font-semibold text-[var(--primary)] hover:underline whitespace-nowrap">
            Storefront
          </Link>
        </header>

        {/* Mobile Drawer */}
        {drawerOpen && (
          <div className="no-print fixed inset-0 z-50 lg:hidden flex">
            <div className="fixed inset-0 bg-black/45" onClick={() => setDrawerOpen(false)} />
            <aside className="relative z-10 w-72 max-w-[85vw] bg-[var(--surface)] h-full overflow-y-auto shadow-[var(--sh-2)]">
              <div className="flex justify-end p-2">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close admin menu"
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              {sidebarContent}
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
        <ToastContainer />
      </div>
    </>
  );
}
