import {
    getCookie,
    getSignedCookie,
    setCookie,
    setSignedCookie,
    deleteCookie,
  } from 'hono/cookie'
const SESSION_COOKIE = 'session_token';

const setSession = async (c, token) => {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Set to true in production
    sameSite: 'lax',
    path: '/',
    // Optionally set 'maxAge' or 'expires'
  });
};

const clearSession = async (c) => {
  deleteCookie(c, SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
};

export { SESSION_COOKIE, setSession, clearSession };