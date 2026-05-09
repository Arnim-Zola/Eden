const API_BASE = 'http://localhost:8000/api';

export const createJob = async (instagramUrl) => {
  const response = await fetch(`${API_BASE}/jobs/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ instagram_url: instagramUrl }),
  });
  if (!response.ok) {
    throw new Error('Failed to create job');
  }
  return response.json();
};

export const getJob = async (jobId) => {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/`);
  if (!response.ok) {
    throw new Error('Failed to fetch job');
  }
  return response.json();
};

export const getJobStatus = async (jobId) => {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/status/`);
  if (!response.ok) {
    throw new Error('Failed to fetch job status');
  }
  return response.json();
};
