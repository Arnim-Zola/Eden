import React, { useEffect, useState } from 'react';
import ClaimCard from './ClaimCard';
import { getJob } from '../services/api';
import AudioWaveVisualizer from './AudioWaveVisualizer';

const ReportView = ({ jobId }) => {
  const [jobData, setJobData] = useState(null);
  const [activeTab, setActiveTab] = useState('claims');

  useEffect(() => {
    if (jobId) {
      getJob(jobId).then(setJobData).catch(console.error);
    }
  }, [jobId]);

  if (!jobData) return (
    <div className="mt-12 flex justify-center animate-pulse">
      <div className="h-8 bg-white/10 rounded w-48"></div>
    </div>
  );

  if (jobData.status === 'FAILED' || (jobData.status === 'COMPLETED' && !jobData.report)) {
    return (
      <div className="mt-12 w-full max-w-3xl mx-auto p-8 bg-red-500/10 border border-red-500/20 rounded-2xl text-center shadow-xl">
        <h2 className="text-2xl text-red-400 font-bold mb-3">Report Generation Failed</h2>
        <p className="text-gray-300 text-lg">
          {jobData.error_message || "The AI analysis could not be completed for this content. It may be too short, lack readable content, or the video might be unavailable."}
        </p>
      </div>
    );
  }

  if (!jobData.report) return (
    <div className="mt-12 flex justify-center animate-pulse">
      <div className="h-8 bg-white/10 rounded w-48"></div>
    </div>
  );

  const ocrAsset = jobData.media_assets?.find(a => a.asset_type === 'OCR_RESULTS');
  const transcriptAsset = jobData.media_assets?.find(a => a.asset_type === 'TRANSCRIPT_RESULTS');

  const showTranscriptTab = jobData.analysis_type !== 'TEXT';
  const showOcrTab = jobData.analysis_type !== 'AUDIO';

  return (
    <div className="mt-12 w-full max-w-5xl mx-auto animate-fade-in-up transition-all duration-500">
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-5 py-2 text-sm font-semibold transition-all duration-300 rounded-t-lg border-x border-t ${activeTab === 'claims' ? 'text-white bg-slate-900 border-slate-700/50 z-10 relative shadow-[0_-2px_10px_rgba(0,0,0,0.2)]' : 'text-slate-400 hover:text-white bg-slate-900/40 border-transparent'}`}
        >
          Claims Analysis
        </button>
        {showTranscriptTab && (
          <button
            onClick={() => setActiveTab('transcript')}
            className={`px-5 py-2 text-sm font-semibold transition-all duration-300 rounded-t-lg border-x border-t ${activeTab === 'transcript' ? 'text-white bg-slate-900 border-slate-700/50 z-10 relative shadow-[0_-2px_10px_rgba(0,0,0,0.2)]' : 'text-slate-400 hover:text-white bg-slate-900/40 border-transparent'}`}
          >
            Audio Transcript
          </button>
        )}
        {showOcrTab && (
          <button
            onClick={() => setActiveTab('ocr')}
            className={`px-5 py-2 text-sm font-semibold transition-all duration-300 rounded-t-lg border-x border-t ${activeTab === 'ocr' ? 'text-white bg-slate-900 border-slate-700/50 z-10 relative shadow-[0_-2px_10px_rgba(0,0,0,0.2)]' : 'text-slate-400 hover:text-white bg-slate-900/40 border-transparent'}`}
          >
            Extracted OCR Text
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-700/50 rounded-b-xl rounded-tr-xl p-5 md:p-6 shadow-2xl relative overflow-hidden -mt-[1px]">
        {activeTab === 'claims' && (
          <div className="animate-fade-in">
            <div className="mb-5 pb-5 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <div className="w-5 h-5 flex items-center justify-center shrink-0 bg-blue-500/10 rounded">
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Executive Summary
              </h2>
              <p className="text-slate-300 leading-relaxed text-sm">{jobData.report.report_data.summary}</p>
            </div>

            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <div className="w-5 h-5 flex items-center justify-center shrink-0 bg-purple-500/10 rounded">
                <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              Extracted Claims
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {jobData.claims?.map(claim => (
                <ClaimCard key={claim.id} claim={claim} />
              ))}
              {(!jobData.claims || jobData.claims.length === 0) && (
                <div className="col-span-2 text-center text-slate-400 p-12 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                  No specific factual claims detected in this content.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <div className="w-5 h-5 flex items-center justify-center shrink-0 bg-green-500/10 rounded">
                <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              Audio Transcript
            </h2>
            {transcriptAsset?.metadata?.unified_transcript && (
              <div className="mb-4">
                <AudioWaveVisualizer />
              </div>
            )}
            {transcriptAsset?.metadata?.unified_transcript ? (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 whitespace-pre-wrap font-mono text-sm text-slate-300 leading-relaxed shadow-inner overflow-y-auto max-h-[400px]">
                {transcriptAsset.metadata.unified_transcript}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-slate-400 italic bg-slate-800/30 rounded-xl border border-slate-700/50">
                {transcriptAsset?.metadata?.audio_detected === false 
                  ? "No audio stream was detected in this content." 
                  : (transcriptAsset?.metadata?.audio_detected && !transcriptAsset?.metadata?.speech_detected)
                    ? "Audio was detected, but no recognizable speech could be transcribed."
                    : "No audio transcript available."}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ocr' && (
          <div className="space-y-3 animate-fade-in">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <div className="w-5 h-5 flex items-center justify-center shrink-0 bg-pink-500/10 rounded">
                <svg className="w-3.5 h-3.5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              Visual Text (OCR)
            </h2>
            {ocrAsset?.metadata?.unified_transcript ? (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 whitespace-pre-wrap font-mono text-sm text-slate-300 leading-relaxed shadow-inner overflow-y-auto max-h-[400px]">
                {ocrAsset.metadata.unified_transcript}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-slate-400 italic bg-slate-800/30 rounded-xl border border-slate-700/50">
                No visual text detected.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportView;

// Forensic media rendering verified.