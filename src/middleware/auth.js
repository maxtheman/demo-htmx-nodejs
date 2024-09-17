// src/middleware/auth.ts
import { jwtVerify, createRemoteJWKSet } from 'jose';
import dotenv from 'dotenv';
import { URL } from 'url';
import { getCookie } from 'hono/cookie';
import { SESSION_COOKIE } from './session';

dotenv.config();

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`)
);

const requiresAuth = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);

  if (!token) {
    return c.redirect('/auth/login');
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${process.env.AUTH0_DOMAIN}/`,
      audience: process.env.AUTH0_CLIENT_ID,
    });
    c.set('user', payload);
    await next();
  } catch (err) {
    console.error('JWT Verification Error:', err);
    return c.redirect('/login');
  }
};

export { requiresAuth };