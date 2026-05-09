import React, { useEffect, useState } from 'react';
import { getJobStatus } from '../services/api';

const JobStatus = ({ jobId, onComplete, onReset }) => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let interval;
    if (jobId) {
      interval = setInterval(async () => {
        try {
          const data = await getJobStatus(jobId);
          setStatus(data);
          
          if (data.status === 'COMPLETED') {
            clearInterval(interval);
            onComplete(data.id);
          } else if (data.status === 'FAILED') {
            clearInterval(interval);
          }
        } catch (error) {
          console.error("Error polling job status", error);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [jobId, onComplete]);

  if (!status) return (
    <div className="mt-8 max-w-sm mx-auto p-6 bg-slate-900/80 border border-slate-700/50 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center text-center">
      <div className="w-10 h-10 flex items-center justify-center shrink-0 mb-3">
        <svg className="animate-spin h-8 w-8 text-blue-500 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <h3 className="text-base font-bold text-white">Connecting...</h3>
      <p className="text-xs text-slate-400 mt-1">Establishing connection to processing engine.</p>
    </div>
  );

  return (
    <div className="mt-8 max-w-sm mx-auto p-6 bg-slate-900/80 border border-slate-700/50 rounded-2xl backdrop-blur-xl shadow-2xl overflow-hidden relative transition-all duration-500 text-center">
      {status.status !== 'COMPLETED' && status.status !== 'FAILED' && (
        <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse-slow w-full"></div>
      )}
      
      <div className="flex justify-center mb-3">
        {status.status === 'FAILED' ? (
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        ) : status.status === 'COMPLETED' ? (
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
             <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <svg className="animate-spin h-8 w-8 text-blue-400 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      <h2 className="text-base font-bold text-white mb-1">
        {status.status === 'FAILED' ? "Analysis Failed" : status.status === 'COMPLETED' ? "Analysis Complete" : "Processing Content"}
      </h2>
      
      <p className="text-slate-400 text-xs mb-3">{status.processing_phase || 'Initializing...'}</p>
      
      {status.status !== 'COMPLETED' && status.status !== 'FAILED' && (
         <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
           <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full w-2/3 animate-pulse rounded-full"></div>
         </div>
      )}
      
      {status.error_message && (
        <div className="mt-6 animate-fade-in-up">
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-left">
            {status.error_message}
          </div>
          {onReset && (
            <button 
              onClick={onReset}
              className="mt-4 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700 shadow text-sm font-semibold"
            >
              Start Over
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default JobStatus;
