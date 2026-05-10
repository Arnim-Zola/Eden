import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, useNavigate, useMatch } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import CommandBar from './components/CommandBar';
import { createJob } from './services/api';
import JobStatus from './components/JobStatus';
import ReportDashboard from './components/ReportDashboard';
import { useOperationHistory } from './hooks/useOperationHistory';
import CommandPalette from './components/CommandPalette';
import './index.css';

// ── Home page: command bar + live pipeline status ─────────────────────────────
function HomePage({ addOperation }) {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [selectedMode, setSelectedMode] = useState(null);
  const [activeJobId, setActiveJobId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url || !selectedMode) return;

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const job = await createJob(url, selectedMode);
      if (job.error) {
        setErrorMsg(job.error);
      } else {
        setActiveJobId(job.id);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg('Failed to submit URL for analysis. Please check your connection or try a different URL.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJobComplete = useCallback((jobId, jobData) => {
    const score = jobData?.risk_score ?? jobData?.riskScore ?? null;
    const riskLevel = score == null
      ? 'pending'
      : score >= 0.66 ? 'high' : score >= 0.33 ? 'medium' : 'low';

    addOperation({
      id: jobId,
      url,
      label: url.replace(/^https?:\/\//, '').slice(0, 40),
      riskLevel,
      riskScore: score,
      timestamp: Date.now(),
    });

    navigate(`/operation/${jobId}`);
  }, [navigate, url, addOperation]);

  // Called by CommandBar's Upload tab after a successful file upload
  const handleUpload = useCallback((job) => {
    addOperation({
      id: job.id,
      url: null,
      label: job.original_filename || 'Local Upload',
      riskLevel: 'pending',
      riskScore: null,
      timestamp: Date.now(),
    });
    navigate(`/operation/${job.id}`);
  }, [navigate, addOperation]);

  const handleReset = useCallback(() => {
    setUrl('');
    setSelectedMode(null);
    setActiveJobId(null);
    setErrorMsg(null);
  }, []);

  return (
    <>
      <CommandBar
        isSubmitted={!!activeJobId}
        isProcessing={!!activeJobId}
        isSubmitting={isSubmitting}
        url={url}
        selectedMode={selectedMode}
        onUrlChange={setUrl}
        onModeChange={setSelectedMode}
        onSubmit={handleSubmit}
        onReset={handleReset}
        onUpload={handleUpload}
      />

      {errorMsg && (
        <div style={{
          width: '100%',
          maxWidth: '640px',
          margin: '16px auto 0',
          padding: '12px 16px',
          background: 'rgba(232,69,60,0.08)',
          border: '1px solid rgba(232,69,60,0.20)',
          borderRadius: '8px',
          color: '#E8453C',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          textAlign: 'center',
        }}>
          {errorMsg}
        </div>
      )}

      {activeJobId && (
        <div style={{ width: '100%', maxWidth: '640px', margin: '32px auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <JobStatus jobId={activeJobId} onComplete={handleJobComplete} onReset={handleReset} />
        </div>
      )}
    </>
  );
}

// ── Operation page: report bento dashboard ────────────────────────────────────
function OperationPage() {
  const navigate = useNavigate();
  const handleReset = useCallback(() => navigate('/'), [navigate]);
  return <ReportDashboard onReset={handleReset} />;
}

// ── Root: shell + routing ─────────────────────────────────────────────────────
function App() {
  const { operations, addOperation, clearHistory } = useOperationHistory();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Derive active operation id from the current route
  const operationMatch = useMatch('/operation/:id');
  const activeId = operationMatch?.params?.id ?? null;

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <AppShell
      operations={operations}
      activeId={activeId}
      onClearHistory={clearHistory}
      onOpenPalette={() => setIsPaletteOpen(true)}
    >
      <Routes>
        <Route path="/" element={<HomePage addOperation={addOperation} />} />
        <Route path="/operation/:id" element={<OperationPage />} />
      </Routes>

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        operations={operations}
        onClearHistory={clearHistory}
      />
    </AppShell>
  );
}

export default App;
