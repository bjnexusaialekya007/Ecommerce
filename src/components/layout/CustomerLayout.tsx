import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Search,
  ShoppingBag,
  Menu,
  Package,
  X,
  WifiOff,
  Globe,
  Store,
} from 'lucide-react';
import { formatAddress } from '../../shared/address';
import { getShopStatus } from '../../shared/calendar';
import { useExperience } from '../../experience';
import { PrefetchLink, triggerPrefetch } from '../../experience/tier0/PrefetchLink';
import { useLangStore } from '../../i18n';
import { useCartStore } from '../../stores/cart';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';
import { useStore } from '../../stores/appContext';
import { useConsentStore } from '../../analytics/consent';
import { ConsentBanner } from '../../analytics/ConsentBanner';
import { ToastContainer } from '../ui/Toast';
import { BottomSheet } from '../ui/BottomSheet';
import { Input } from '../ui/Input';
import { SocialLinks } from '../SocialLinks';
import { CartBar } from '../shop/CartBar';
import { WhatsAppWidget } from '../shop/WhatsAppWidget';
import { PWAInstallButton } from '../ui/PWAInstallButton';

export function CustomerLayout() {
  const { config, catalog, isDemo } = useStore();
  const { fxEnabled, reducedMotion } = useExperience();
  const useVt = fxEnabled && !reducedMotion;
  const { lang, setLang } = useLangStore();
  const lines = useCartStore((s) => s.lines);
  const buyer = useAuthStore((s) => s.buyer);
  const announcementDismissed = useUiStore((s) => s.announcementDismissed);
  const dismissAnnouncement = useUiStore((s) => s.dismissAnnouncement);
  const reopenConsent = useConsentStore((s) => s.reopenBanner);

  const location = useLocation();
  const navigate = useNavigate();

  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  const cartCount = lines.reduce((sum, l) => sum + l.qty, 0);
  const shop = getShopStatus(config);

  useEffect(() => {
    const syncBottomNav = () => {
      const mobile = window.innerWidth < 768;
      document.documentElement.style.setProperty('--bottomnav-h', mobile ? '64px' : '0px');
    };
    syncBottomNav();
    window.addEventListener('resize', syncBottomNav);

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('resize', syncBottomNav);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    setMoreOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    setSearchOpen(false);
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop', { viewTransition: useVt });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `min-h-[44px] inline-flex items-center px-2 text-sm font-medium whitespace-nowrap shrink-0 underline-offset-4 hover:underline transition-colors ${
      isActive ? 'text-[var(--primary)] font-semibold' : 'text-[var(--ink)] hover:text-[var(--primary)]'
    }`;

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg)] text-[var(--ink)]">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {/* Demo mode strip */}
      {isDemo && (
        <div className="no-print bg-[var(--ink)] text-white text-xs px-4 py-1.5 text-center">
          Demo client configuration active (<code className="font-mono">?client=demo</code>) — inspect white-label theme swap &amp; N1 checks.
        </div>
      )}

      {/* Offline strip */}
      {!online && (
        <div className="no-print bg-[var(--warn-bg)] text-[var(--warn-ink)] text-xs font-medium px-4 py-2 flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          <span>You appear offline. Cached catalog items remain browsable; checkout requires connectivity.</span>
        </div>
      )}

      {/* Announcement / Shop busy strip */}
      {!announcementDismissed && (config.copy.announcement || shop.status !== 'open') && (
        <div className="no-print bg-[var(--accent-soft)] border-b border-[var(--accent-border)] px-4 py-1.5 text-xs text-[var(--on-secondary-fixed)]">
          <div className="mx-auto max-w-6xl flex items-center justify-between gap-3">
            <p className="truncate font-medium">
              <span className="font-bold text-[var(--accent)] mr-1.5">
                {shop.status !== 'open' ? 'Kitchen notice:' : 'Fresh batch dispatch:'}
              </span>
              {shop.status !== 'open'
                ? shop.reason
                : config.copy.announcement || `${config.contact.addressParts.city} Roastery · Fresh batches packed daily`}
            </p>
            <button
              type="button"
              onClick={dismissAnnouncement}
              aria-label="Dismiss announcement"
              className="p-1 text-[var(--accent)] hover:text-[var(--on-secondary-fixed)] shrink-0"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* 3-Zone Header */}
      <header className="no-print header-condense sticky top-0 z-30 border-b border-[var(--border-soft)]/70 bg-[var(--bg)]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand wordmark (single-line) */}
          <PrefetchLink
            to="/"
            className="header-brand font-display text-lg sm:text-xl font-bold tracking-tight text-[var(--primary)] whitespace-nowrap shrink-0 min-h-[44px] inline-flex items-center"
          >
            {config.brand.shortName}
          </PrefetchLink>

          {/* Zone 2: Desktop Primary Nav */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
            <NavLink to="/" end viewTransition={useVt} className={navLinkClass}>
              Home
            </NavLink>
            <NavLink
              to="/shop"
              viewTransition={useVt}
              onPointerDown={() => triggerPrefetch('/shop', 'intent')}
              className={navLinkClass}
            >
              Shop
            </NavLink>
            {config.features.wholesale && (
              <NavLink
                to="/wholesale"
                viewTransition={useVt}
                onPointerDown={() => triggerPrefetch('/wholesale', 'intent')}
                className={navLinkClass}
              >
                {buyer?.wholesaleStatus === 'approved' ? 'Wholesale Portal' : 'Wholesale'}
              </NavLink>
            )}
            <NavLink
              to="/track"
              viewTransition={useVt}
              onPointerDown={() => triggerPrefetch('/track', 'intent')}
              className={navLinkClass}
            >
              Track order
            </NavLink>
            <NavLink
              to="/contact"
              viewTransition={useVt}
              onPointerDown={() => triggerPrefetch('/contact', 'intent')}
              className={navLinkClass}
            >
              Contact
            </NavLink>
          </nav>

          {/* Zone 3: Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search snacks"
              className="pressable inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--ink)] hover:bg-[var(--surface-2)]"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'te' : 'en')}
              aria-label={lang === 'en' ? 'Switch language to Telugu' : 'Switch language to English'}
              className="hidden sm:inline-flex min-h-[44px] items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)]"
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'en' ? 'EN' : 'తె'}</span>
            </button>

            <Link
              to="/cart"
              viewTransition={useVt}
              data-cart-target="header"
              aria-label={`Cart (${cartCount} packs)`}
              className="pressable relative inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--primary)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] shadow-[var(--sh-1)] transition-colors whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="h-4 w-4 text-[var(--on-primary-container)]" aria-hidden="true" />
              <span className="hidden sm:inline">Cart</span>
              <span
                data-cart-badge="header"
                className="tabular-nums rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold inline-block"
              >
                {cartCount}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main
        id="main"
        className="flex-1 pb-[calc(var(--cartbar-h)+var(--bottomnav-h)+24px)] md:pb-12"
      >
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-[var(--border-soft)]/70 bg-[var(--surface)] text-sm">
        <div className="mx-auto max-w-6xl px-4 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <p className="font-display text-lg font-bold text-[var(--primary)]">{config.brand.name}</p>
            <p className="text-xs text-[var(--ink-muted)] leading-relaxed">{formatAddress(config)}</p>
            <SocialLinks config={config} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">Shop &amp; Orders</p>
            <ul className="space-y-1.5 text-sm">
              <li><Link to="/shop" className="hover:text-[var(--primary)]">All packaged snacks</Link></li>
              <li><Link to="/track" className="hover:text-[var(--primary)]">Track your order</Link></li>
              {config.features.wholesale && (
                <li><Link to="/wholesale" className="hover:text-[var(--primary)]">Wholesale &amp; corporate packs</Link></li>
              )}
              <li><Link to="/about" className="hover:text-[var(--primary)]">Our kitchen &amp; craft</Link></li>
              <li><Link to="/faq" className="hover:text-[var(--primary)]">Freshness &amp; shipping FAQ</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">Policies &amp; Legal</p>
            <ul className="space-y-1.5 text-sm">
              <li><Link to="/policies/privacy" className="hover:text-[var(--primary)]">Privacy Policy</Link></li>
              <li><Link to="/policies/terms" className="hover:text-[var(--primary)]">Terms &amp; Conditions</Link></li>
              <li><Link to="/policies/refunds" className="hover:text-[var(--primary)]">Refund &amp; Replacement Policy</Link></li>
              <li><Link to="/policies/shipping" className="hover:text-[var(--primary)]">Shipping &amp; Delivery Policy</Link></li>
              {config.analytics.ga4Id && (
                <li>
                  <button type="button" onClick={reopenConsent} className="hover:text-[var(--primary)] underline">
                    Cookie settings
                  </button>
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Compliance &amp; Hours</p>
            <div className="rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-2 space-y-0.5 text-xs text-[var(--on-secondary-fixed)] tabular-nums">
              <p>
                FSSAI: <span className="font-semibold font-mono">{config.legal.fssai}</span>
              </p>
              <p>
                GSTIN: <span className="font-semibold font-mono">{config.legal.gstin}</span>
              </p>
            </div>
            <p className="text-xs text-[var(--ink-muted)]">
              Dispatch hours: {config.hours.openTime} – {config.hours.closeTime} IST
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setLang(lang === 'en' ? 'te' : 'en')}
                className="underline font-medium text-[var(--primary)]"
              >
                {lang === 'en' ? 'తెలుగులో చూడండి' : 'View in English'}
              </button>
              <Link to="/admin/login" className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
                Staff Console
              </Link>
              {import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV !== '0' && (
                <Link to="/dev/checks" className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
                  Dev Checks
                </Link>
              )}
            </div>
            {config.features.pwa && (
              <div className="pt-1">
                <PWAInstallButton compact />
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-[var(--border-soft)] py-3 px-4 text-center text-xs text-[var(--ink-muted)]">
          © {new Date().getFullYear()} {config.legal.legalName}. Packed to order in India.
        </div>
      </footer>

      {/* Mobile sticky CartBar */}
      <CartBar config={config} catalog={catalog} />

      {/* Mobile 5-item BottomNav */}
      <nav
        aria-label="Mobile navigation"
        className="no-print md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 border-t border-[var(--border-soft)] bg-[var(--surface)]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-full">
          <NavLink
            to="/"
            end
            viewTransition={useVt}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                isActive ? 'text-[var(--primary)]' : 'text-[var(--ink-muted)]'
              }`
            }
          >
            <Home className="h-5 w-5" aria-hidden="true" />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/shop"
            viewTransition={useVt}
            onTouchStart={() => triggerPrefetch('/shop', 'intent')}
            onPointerDown={() => triggerPrefetch('/shop', 'intent')}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                isActive ? 'text-[var(--primary)]' : 'text-[var(--ink-muted)]'
              }`
            }
          >
            <Store className="h-5 w-5" aria-hidden="true" />
            <span>Shop</span>
          </NavLink>

          <NavLink
            to="/track"
            viewTransition={useVt}
            onTouchStart={() => triggerPrefetch('/track', 'intent')}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                isActive ? 'text-[var(--primary)]' : 'text-[var(--ink-muted)]'
              }`
            }
          >
            <Package className="h-5 w-5" aria-hidden="true" />
            <span>Track</span>
          </NavLink>

          <NavLink
            to="/cart"
            viewTransition={useVt}
            data-cart-target="mobile-nav"
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                isActive ? 'text-[var(--primary)]' : 'text-[var(--ink-muted)]'
              }`
            }
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            <span data-cart-badge="mobile-nav">Cart{cartCount > 0 ? ` (${cartCount})` : ''}</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-[var(--ink-muted)]"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Search Sheet */}
      <BottomSheet open={searchOpen} onClose={() => setSearchOpen(false)} title="Search snacks">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <Input
            label="What are you craving?"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Try bhujia, ratlami, mixture, spicy, no onion…"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="min-h-[44px] rounded-xl px-4 text-sm font-medium text-[var(--ink-muted)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="pressable min-h-[44px] rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-5 text-sm font-semibold text-white transition-colors"
            >
              Search
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* More Sheet */}
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title={config.brand.shortName}>
        <div className="space-y-2 text-sm">
          {config.features.wholesale && (
            <Link to="/wholesale" className="flex min-h-[44px] items-center justify-between rounded-xl px-3 hover:bg-[var(--surface-2)] font-medium">
              <span>Wholesale &amp; Bulk Portal</span>
              <span className="text-xs text-[var(--ink-muted)]">GST billing</span>
            </Link>
          )}
          <Link to="/about" className="flex min-h-[44px] items-center rounded-xl px-3 hover:bg-[var(--surface-2)] font-medium">
            Our Story &amp; Kitchen
          </Link>
          <Link to="/contact" className="flex min-h-[44px] items-center rounded-xl px-3 hover:bg-[var(--surface-2)] font-medium">
            Contact &amp; Store Address
          </Link>
          <Link to="/faq" className="flex min-h-[44px] items-center rounded-xl px-3 hover:bg-[var(--surface-2)] font-medium">
            Shipping &amp; Freshness FAQ
          </Link>
          <Link to="/policies/privacy" className="flex min-h-[44px] items-center rounded-xl px-3 hover:bg-[var(--surface-2)]">
            Privacy, Terms &amp; Refund Policies
          </Link>
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'te' : 'en')}
            className="flex w-full min-h-[44px] items-center justify-between rounded-xl border border-[var(--border-soft)] px-3 font-medium text-[var(--primary)]"
          >
            <span>Language / భాష</span>
            <span>{lang === 'en' ? 'Switch to తెలుగు' : 'Switch to English'}</span>
          </button>
          {config.features.pwa && <PWAInstallButton className="w-full justify-center" />}
        </div>
      </BottomSheet>

      <WhatsAppWidget
        config={config}
        hidden={location.pathname.startsWith('/admin') || location.pathname.startsWith('/invoice')}
      />
      <ConsentBanner config={config} />
      <ToastContainer />
    </div>
  );
}
