/// <reference types="vite/client" />

const viteEnv = /** @type {{ DEV: boolean, VITE_API_URL?: string }} */ (import.meta.env);
const runtimeApiUrl = globalThis.longDriveRuntime?.apiBaseUrl;
const developmentApiUrl = viteEnv.DEV ? 'http://127.0.0.1:5000/api' : null;
const configuredApiUrl = runtimeApiUrl || viteEnv.VITE_API_URL || developmentApiUrl;

if (!configuredApiUrl) {
  throw new Error('VITE_API_URL must be configured for production builds.');
}

export const API_BASE_URL = configuredApiUrl.replace(/\/+$/, '');
