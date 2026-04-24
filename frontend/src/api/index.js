// src/api/index.js
// All backend API calls live here

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Automatically attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (email, password) =>
  api.post('/auth/login', { email, password });

// Schools
export const getSchools = () => api.get('/schools');
export const getSchool = (id) => api.get(`/schools/${id}`);
export const getMySchools = () => api.get('/schools/mentor/my-schools');

// Mentors
export const getMentors = () => api.get('/mentors');
export const getMentor = (id) => api.get(`/mentors/${id}`);

// Visits
export const getVisits = () => api.get('/visits');
export const createVisit = (data) => api.post('/visits', data);

// Flags
export const getFlags = () => api.get('/flags');
export const createFlag = (data) => api.post('/flags', data);

// Reflections
export const getReflections = () => api.get('/reflections');
export const createReflection = (data) => api.post('/reflections', data);

export default api;