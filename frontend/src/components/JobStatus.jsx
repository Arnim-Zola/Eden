import React, { useEffect, useState } from 'react';
import { getJobStatus } from '../services/api';
import PipelineStepper from './PipelineStepper';

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
    <PipelineStepper processingPhase="Initializing..." jobId={jobId} />
  );

  if (status.status === 'FAILED') {
    const raw = status.error_message || '';

    // Parse structured error code from backend
    let heading = 'Analysis Failed';
    let detail = raw;
    let hint = null;

    if (raw.includes('COOKIES_REQUIRED')) {
      heading = 'Authentication Required';
      detail = 'Instagram requires a valid session cookie to access this content.';
      hint = (
        <ol style={{ textAlign: 'left', margin: '10px 0 0', padding: '0 0 0 18px', fontSize: 12, lineHeight: 1.7, color: 'rgba(232,230,224,0.55)', fontFamily: 'var(--font-sans)' }}>
          <li>Install the <strong style={{ color: '#E8E6E0' }}>"Get cookies.txt LOCALLY"</strong> Chrome/Firefox extension</li>
          <li>Log into <strong style={{ color: '#E8E6E0' }}>instagram.com</strong> in your browser</li>
          <li>Click the extension → Export cookies for this tab</li>
          <li>Save the file to <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>backend/config/cookies.txt</code></li>
          <li>Restart Django and retry</li>
        </ol>
      );
    } else if (raw.includes('RATE_LIMIT_OR_LOGIN')) {
      heading = 'Rate Limited';
      detail = 'Instagram is temporarily blocking this request. Wait 10–15 minutes and try again, or use a fresh session cookie.';
    } else if (raw.includes('PRIVATE_CONTENT')) {
      heading = 'Private Content';
      detail = 'This post is private. Your Instagram account must follow the creator to analyze it.';
    } else if (raw.includes('CONTENT_NOT_FOUND')) {
      heading = 'Content Not Found';
      detail = 'This post may have been deleted or the URL is incorrect.';
    }

    return (
      <div style={{
        marginTop: 32, maxWidth: 520, width: '100%', margin: '32px auto 0',
        padding: '24px', background: 'var(--bg-card)',
        border: '1px solid rgba(232,69,60,0.20)',
        borderRadius: 'var(--radius-lg)', textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: '#E8453C', marginBottom: 10,
        }}>
          {heading}
        </div>
        <div style={{
          padding: '12px 16px',
          background: 'rgba(232,69,60,0.07)',
          border: '1px solid rgba(232,69,60,0.15)',
          borderRadius: 'var(--radius-md)',
          color: 'rgba(232,230,224,0.7)',
          fontSize: 13, fontFamily: 'var(--font-sans)', lineHeight: 1.6,
          marginBottom: hint ? 0 : 20,
          textAlign: 'left',
        }}>
          {detail}
          {hint}
        </div>
        {onReset && (
          <button
            onClick={onReset}
            style={{
              marginTop: 20, display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', fontFamily: 'var(--font-mono)',
              fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
              borderRadius: 'var(--radius-sm)', padding: '8px 20px',
              background: 'transparent', color: 'rgba(232,230,224,0.4)',
              border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
              transition: 'border-color 150ms, color 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#E8E6E0'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(232,230,224,0.4)'; }}
          >
            Start Over
          </button>
        )}
      </div>
    );
  }


  return (
    <div className="w-full">
      <PipelineStepper processingPhase={status.processing_phase || 'Initializing...'} jobId={jobId} />
    </div>
  );
};

export default JobStatus;
