const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
const defaultApiUrl = `${window.location.protocol}//${window.location.hostname}:8000`;

export const API_URL = configuredApiUrl || defaultApiUrl;
export const WS_URL = `${API_URL.replace(/^http/, 'ws')}/ws`;
