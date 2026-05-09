import React, { useEffect, useState } from 'react';
import { getJobStatus } from '../services/api';

const JobStatus = ({ jobId, onComplete }) => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let interval;
    if (jobId) {
      interval = setInterval(async () => {
        try {
          const data = await getJobStatus(jobId);
          setStatus(data);
          
          if (data.status === 'COMPLETED' || data.status === 'FAILED') {
            clearInterval(interval);
            onComplete(data.id);
          }
        } catch (error) {
          console.error("Error polling job status", error);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [jobId, onComplete]);

  if (!status) return (
    <div className="mt-8 p-6 bg-[#18181b]/80 border border-white/5 rounded-2xl backdrop-blur-xl shadow-2xl flex justify-center">
      <div className="animate-pulse flex items-center space-x-4">
        <div className="rounded-full bg-white/10 h-10 w-10"></div>
        <div className="space-y-3 w-48">
          <div className="h-2 bg-white/10 rounded"></div>
          <div className="h-2 bg-white/10 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-8 p-6 bg-[#18181b]/90 border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl overflow-hidden relative transition-all duration-500">
      {status.status !== 'COMPLETED' && status.status !== 'FAILED' && (
        <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse-slow w-full"></div>
      )}
      <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-3">
        {status.status === 'FAILED' ? (
          <span className="text-red-400 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Analysis Failed
          </span>
        ) : status.status === 'COMPLETED' ? (
          <span className="text-green-400 flex items-center gap-2">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Analysis Complete
          </span>
        ) : (
          <span className="text-blue-400 flex items-center gap-2">
            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing Content
          </span>
        )}
      </h2>
      <div className="flex items-center gap-4">
        {status.status !== 'COMPLETED' && status.status !== 'FAILED' && (
           <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
             <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full w-1/2 animate-pulse rounded-full"></div>
           </div>
        )}
        <p className="text-gray-400 flex-1">{status.processing_phase || 'Initializing...'}</p>
      </div>
      
      {status.error_message && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{status.error_message}</span>
        </div>
      )}
    </div>
  );
};

export default JobStatus;
