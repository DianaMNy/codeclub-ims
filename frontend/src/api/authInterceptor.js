// src/api/authInterceptor.js
// Global 401 handling for every axios call in the app — redirects to
// /login with a "session expired" message instead of letting pages
// silently render blank on an expired/invalid JWT.
//
// Why this file exists instead of a plain axios.interceptors.response.use():
// 19 pages each create their OWN axios instance via axios.create() — none
// of them import frontend/src/api/index.js's shared `api` instance, and
// axios.create() instances do NOT inherit interceptors registered on the
// bare `axios` object (verified directly: a plain interceptor here would
// silently miss ~18 of those 19 files' requests, since only DonorView.jsx
// calls axios.get() on the bare object — everything else goes through a
// local .create() instance). To get real app-wide coverage without editing
// 19 files, this patches axios.create() itself so every instance created
// from this point forward automatically gets the same response
// interceptor attached, in addition to registering it on the bare `axios`
// object for that one direct-call case.
//
// This only works if it runs before any page's axios.create() call runs —
// it's imported first thing in main.jsx, before `import App from './App.jsx'`,
// so it's in place before the route tree (and therefore every page module)
// is evaluated.
import axios from 'axios';

const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'user';
const SESSION_EXPIRED_FLAG = 'sessionExpired';

function handle401(error) {
  if (error.response?.status !== 401) {
    return Promise.reject(error);
  }

  const requestUrl = error.config?.url || '';
  const isLoginRequest = requestUrl.includes('/auth/login');
  const alreadyOnLoginPage = window.location.pathname === '/login';

  // A wrong-password 401 from the login form itself must still show its
  // own inline "invalid credentials" message, not bounce through a
  // redirect. And if we're already on /login, redirecting again is at
  // best a no-op and at worst a loop — skip it either way.
  if (isLoginRequest || alreadyOnLoginPage) {
    return Promise.reject(error);
  }

  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  // Read by Login.jsx on mount to show "Your session expired..." — a
  // sessionStorage flag survives the full-page redirect below (a plain JS
  // variable wouldn't) but clears itself once read, so it never lingers
  // into a later, unrelated login.
  sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1');
  window.location.href = '/login';

  return Promise.reject(error);
}

axios.interceptors.response.use((res) => res, handle401);

const originalCreate = axios.create;
axios.create = function patchedCreate(...args) {
  const instance = originalCreate.apply(axios, args);
  instance.interceptors.response.use((res) => res, handle401);
  return instance;
};
