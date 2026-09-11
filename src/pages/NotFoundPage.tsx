import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { SatyaTagLogo } from '../components/Brand';
import { Button } from '../components/common/Button';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="mb-6"><SatyaTagLogo size="lg" /></div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-govblue-500">Error 404</p>
        <h1 className="mt-2 text-3xl font-bold text-navy-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The page you are looking for does not exist or may have been moved. Check the URL or return to a known section.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => navigate('/dashboard')} icon={Home} fullWidth>Go to Dashboard</Button>
          <Button variant="outline" onClick={() => navigate(-1)} icon={ArrowLeft} fullWidth>Go Back</Button>
        </div>
        <p className="mt-6 text-[10px] text-slate-400">
          Department of Consumer Affairs · Government of India
        </p>
      </div>
    </div>
  );
};

export default NotFoundPage;