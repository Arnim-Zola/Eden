import React from 'react';

const ClaimCard = ({ claim }) => {
  const getRiskColor = (label) => {
    switch (label) {
      case 'VERIFIED_LIKELY_TRUE': return 'bg-green-500/10 text-green-300 border-green-500/30 hover:border-green-500/60 shadow-[0_4px_20px_rgba(34,197,94,0.05)]';
      case 'PLAUSIBLE': return 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:border-blue-500/60 shadow-[0_4px_20px_rgba(59,130,246,0.05)]';
      case 'UNVERIFIED': return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30 hover:border-yellow-500/60 shadow-[0_4px_20px_rgba(234,179,8,0.05)]';
      case 'OPINION_OR_SATIRE': return 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:border-purple-500/60 shadow-[0_4px_20px_rgba(168,85,247,0.05)]';
      case 'MISLEADING_CONTEXT': return 'bg-orange-500/10 text-orange-300 border-orange-500/30 hover:border-orange-500/60 shadow-[0_4px_20px_rgba(249,115,22,0.05)]';
      case 'LIKELY_FALSE': return 'bg-red-500/10 text-red-300 border-red-500/30 hover:border-red-500/60 shadow-[0_4px_20px_rgba(239,68,68,0.1)]';
      case 'HIGH_RISK': return 'bg-rose-600/20 text-rose-300 border-rose-500/50 hover:border-rose-500/80 shadow-[0_0_20px_rgba(225,29,72,0.2)]';
      default: return 'bg-gray-500/10 text-gray-300 border-gray-500/30 hover:border-gray-500/60 shadow-[0_4px_20px_rgba(107,114,128,0.05)]';
    }
  };

  const riskClasses = getRiskColor(claim.classification_label);

  return (
    <div className={`p-6 rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group flex flex-col h-full ${riskClasses}`}>
      <div className="flex justify-between items-start mb-4 gap-4">
        <h3 className="text-[17px] font-bold leading-snug flex-1 text-white group-hover:text-white/90 transition-colors">{claim.claim_text}</h3>
        <span className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest rounded-full bg-black/50 border border-white/5 whitespace-nowrap">
          {claim.classification_label.replace(/_/g, ' ')}
        </span>
      </div>
      <p className="text-sm opacity-80 mb-6 leading-relaxed flex-1 font-light">{claim.contextual_reasoning}</p>
      
      <div className="flex justify-between items-center text-xs opacity-60 border-t border-white/10 pt-4 mt-auto">
        <span className="px-2.5 py-1 bg-black/30 rounded-md font-mono tracking-wide uppercase flex items-center gap-1.5">
           <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
           {claim.detection_source}
        </span>
        <span className="font-semibold flex items-center gap-1.5">
           <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
           {(claim.confidence_score * 100).toFixed(0)}% Confidence
        </span>
      </div>
    </div>
  );
};

export default ClaimCard;
