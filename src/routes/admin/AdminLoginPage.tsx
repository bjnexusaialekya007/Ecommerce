import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useAuthStore } from '../../stores/auth';
import { OtpLoginForm } from '../../components/shop/OtpLoginForm';

export function AdminLoginPage() {
  const setAdminEmail = useAuthStore((s) => s.setAdminEmail);
  const navigate = useNavigate();

  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <div className="min-h-dvh bg-[var(--bg)] flex items-center justify-center px-4 py-12">
        <OtpLoginForm
          role="admin"
          title="Staff Operations Sign In"
          subtitle="Use any team admin email to receive a 6-digit login code."
          defaultEmail="ops@bikanerheritage.in"
          onVerified={async ({ email }) => {
            setAdminEmail(email);
            await api.adminGetOrders().catch(() => []);
            navigate('/admin');
          }}
        />
      </div>
    </>
  );
}
