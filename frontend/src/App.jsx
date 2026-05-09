import { useState } from 'react';
import { createJob } from './services/api';
import JobStatus from './components/JobStatus';
import ReportView from './components/ReportView';
import './index.css';

function App() {
  const [url, setUrl] = useState('');
  const [activeJobId, setActiveJobId] = useState(null);
  const [completedJobId, setCompletedJobId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;
    
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const job = await createJob(url);
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

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-100 selection:bg-purple-500/30 font-sans pb-20 relative overflow-hidden">
      {/* Background blobs for aesthetics */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-blob"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-blob animation-delay-2000"></div>

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

      <main className="px-4 relative z-10 flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
        <form onSubmit={handleSubmit} className="w-full max-w-2xl relative group mb-4">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex flex-col md:flex-row items-center bg-[#18181b] rounded-2xl p-2 border border-white/10 shadow-2xl transition-all duration-300 hover:border-white/20">
            <input
              type="url"
              placeholder="https://www.instagram.com/reel/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 w-full bg-transparent px-4 py-3 text-white outline-none placeholder-gray-500 text-lg"
              required
              disabled={isSubmitting || activeJobId}
            />
            <button
              type="submit"
              disabled={isSubmitting || activeJobId}
              className="w-full md:w-auto mt-2 md:mt-0 bg-white text-black font-semibold px-8 py-3 rounded-xl hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 shadow-lg"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting...
                </span>
              ) : 'Analyze'}
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
            <JobStatus jobId={activeJobId} onComplete={handleJobComplete} />
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
