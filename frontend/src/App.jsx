import { useState } from 'react';
import { createJob } from './services/api';
import JobStatus from './components/JobStatus';
import ReportView from './components/ReportView';
import './index.css';

function App() {
  const [url, setUrl] = useState('');
  const [selectedMode, setSelectedMode] = useState(null);
  const [activeJobId, setActiveJobId] = useState(null);
  const [completedJobId, setCompletedJobId] = useState(null);
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
         setCompletedJobId(null);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg('Failed to submit URL for analysis. Please check your connection or try a different URL.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJobComplete = (id) => {
    setCompletedJobId(id);
    setActiveJobId(null);
  };

  const handleReset = () => {
    setUrl('');
    setSelectedMode(null);
    setActiveJobId(null);
    setCompletedJobId(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-purple-500/30 font-sans pb-20 relative overflow-hidden flex flex-col items-center">
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#09090b] to-black -z-10"></div>
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[140px] pointer-events-none animate-blob"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[140px] pointer-events-none animate-blob animation-delay-2000"></div>

      <header className="pt-20 pb-10 px-4 text-center relative z-10 animate-fade-in-up">
        <div className="inline-block mb-4 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold tracking-widest uppercase text-purple-300 shadow-xl">
          Eden AI MVP
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-gray-500 mb-6 drop-shadow-sm">
          Truth at a Glance
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Paste an Instagram Reel or Post URL below to extract claims, transcribe audio, read on-screen text, and run an automated fact-checking analysis.
        </p>
      </header>

      <main className="px-4 w-full relative z-10 flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
        <form onSubmit={handleSubmit} className="w-full max-w-3xl relative group mb-4">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex flex-col bg-slate-900/90 backdrop-blur-sm rounded-2xl p-5 border border-white/20 shadow-2xl transition-all duration-300 hover:border-white/30 gap-6">
            
            <input
              type="url"
              placeholder="https://www.instagram.com/reel/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-950/50 rounded-xl px-5 py-4 text-white outline-none border border-slate-800 placeholder-slate-500 text-lg focus:border-purple-500/50 transition-colors shadow-inner"
              required
              disabled={isSubmitting || activeJobId}
            />

            {/* Mode Selection Cards */}
            {!activeJobId && !completedJobId && url && (
              <div className="flex flex-col gap-3 animate-fade-in-up">
                <p className="text-sm text-slate-400 font-medium px-1">Select Analysis Mode:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div 
                    onClick={() => setSelectedMode('text')}
                    className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 flex flex-col gap-1.5 ${selectedMode === 'text' ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/70 hover:border-slate-600'}`}
                  >
                    <div className="font-bold text-white flex items-center justify-between text-sm">
                      Analyze Text
                      {selectedMode === 'text' && <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>}
                    </div>
                    <div className="text-xs text-slate-400 leading-relaxed">Best for infographic and text-heavy posts.</div>
                  </div>

                  <div 
                    onClick={() => setSelectedMode('audio')}
                    className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 flex flex-col gap-1.5 ${selectedMode === 'audio' ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/70 hover:border-slate-600'}`}
                  >
                    <div className="font-bold text-white flex items-center justify-between text-sm">
                      Analyze Audio
                      {selectedMode === 'audio' && <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>}
                    </div>
                    <div className="text-xs text-slate-400 leading-relaxed">Best for podcasts, speeches, and talking reels.</div>
                  </div>

                  <div 
                    className="p-4 rounded-xl border bg-slate-900/30 border-slate-800/50 opacity-50 cursor-not-allowed flex flex-col gap-1.5 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-striped opacity-5 mix-blend-overlay"></div>
                    <div className="font-bold text-slate-500 flex items-center justify-between text-sm">
                      Analyze Frame
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-800 text-slate-400 px-2 py-0.5 rounded shadow-sm">Soon</span>
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed">Analyze specific manipulated frames manually.</div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || activeJobId || !url || !selectedMode}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white font-bold tracking-wide px-8 py-3.5 rounded-xl hover:from-purple-400 hover:to-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-95 shadow-lg border border-white/10"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Initializing Pipeline...
                </span>
              ) : selectedMode ? 'Start Analysis' : 'Select a Mode'}
            </button>
          </div>
        </form>

        {errorMsg && (
           <div className="w-full max-w-2xl mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center animate-fade-in-up">
              {errorMsg}
           </div>
        )}

        {activeJobId && (
          <div className="w-full max-w-2xl mt-8 animate-fade-in-up">
            <JobStatus jobId={activeJobId} onComplete={handleJobComplete} onReset={handleReset} />
          </div>
        )}

        {completedJobId && !activeJobId && (
          <ReportView jobId={completedJobId} />
        )}
      </main>
    </div>
  );
}

export default App;
