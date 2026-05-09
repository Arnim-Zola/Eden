import React, { useEffect, useState } from 'react';
import ClaimCard from './ClaimCard';
import { getJob } from '../services/api';

const ReportView = ({ jobId }) => {
  const [jobData, setJobData] = useState(null);
  const [activeTab, setActiveTab] = useState('claims');

  useEffect(() => {
    if (jobId) {
      getJob(jobId).then(setJobData).catch(console.error);
    }
  }, [jobId]);

  if (!jobData || !jobData.report) return (
     <div className="mt-12 flex justify-center animate-pulse">
        <div className="h-8 bg-white/10 rounded w-48"></div>
     </div>
  );

  const ocrAsset = jobData.media_assets?.find(a => a.asset_type === 'OCR_RESULTS');
  const transcriptAsset = jobData.media_assets?.find(a => a.asset_type === 'TRANSCRIPT_RESULTS');

  return (
    <div className="mt-12 w-full max-w-5xl mx-auto animate-fade-in-up transition-all duration-500">
      <div className="flex gap-2 mb-8 border-b border-white/10 pb-2 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('claims')}
          className={`px-5 py-3 font-medium transition-all duration-300 rounded-t-lg ${activeTab === 'claims' ? 'text-white bg-white/5 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
          Claims Analysis
        </button>
        <button 
          onClick={() => setActiveTab('transcript')}
          className={`px-5 py-3 font-medium transition-all duration-300 rounded-t-lg ${activeTab === 'transcript' ? 'text-white bg-white/5 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
          Audio Transcript
        </button>
        <button 
          onClick={() => setActiveTab('ocr')}
          className={`px-5 py-3 font-medium transition-all duration-300 rounded-t-lg ${activeTab === 'ocr' ? 'text-white bg-white/5 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
          Video OCR Text
        </button>
      </div>

      <div className="bg-[#18181b]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
        {activeTab === 'claims' && (
          <div className="animate-fade-in">
            <div className="mb-10 pb-10 border-b border-white/10">
              <h2 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-6 flex items-center gap-3">
                 <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
                 Executive Summary
              </h2>
              <p className="text-gray-300 leading-relaxed text-lg md:text-xl font-light">{jobData.report.report_data.summary}</p>
            </div>
            
            <h3 className="text-2xl font-semibold text-white mb-8 flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Extracted Claims
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {jobData.claims?.map(claim => (
                <ClaimCard key={claim.id} claim={claim} />
              ))}
              {(!jobData.claims || jobData.claims.length === 0) && (
                <div className="col-span-2 text-center text-gray-500 p-12 bg-white/5 rounded-2xl border border-white/10">
                   No specific factual claims detected in this content.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="space-y-6 text-gray-300 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
               <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
               </svg>
               Whisper Audio Transcript
            </h2>
            {transcriptAsset?.metadata?.unified_transcript ? (
              <div className="p-8 bg-[#09090b]/80 rounded-2xl border border-white/5 whitespace-pre-wrap font-mono text-[15px] leading-loose shadow-inner overflow-x-auto">
                {transcriptAsset.metadata.unified_transcript}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 italic bg-white/5 rounded-2xl border border-white/10">
                No audio transcript available for this content.
              </div>
            )}
          </div>
        )}

        {activeTab === 'ocr' && (
          <div className="space-y-6 text-gray-300 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
               <svg className="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
               </svg>
               Visual Text (OCR)
            </h2>
            {ocrAsset?.metadata?.unified_transcript ? (
              <div className="p-8 bg-[#09090b]/80 rounded-2xl border border-white/5 whitespace-pre-wrap font-mono text-[15px] leading-loose shadow-inner overflow-x-auto">
                {ocrAsset.metadata.unified_transcript}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 italic bg-white/5 rounded-2xl border border-white/10">
                No visual text detected in this content.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportView;
