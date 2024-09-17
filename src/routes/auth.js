import { clearSession } from "../middleware/session";
import { Hono } from "hono";
import { setSession } from "../middleware/session";
import dotenv from "dotenv";
import { jwtVerify, createRemoteJWKSet } from "jose";

import { URL } from "url";

dotenv.config();

const auth = new Hono();

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`)
);

auth.get("/callback", async (c) => {
  const code = c.req.query("code");

  if (!code) {
    return c.text("Authorization code not found", 400);
  }

  // Exchange the authorization code for tokens (Access Token, ID Token)
  // This requires making a POST request to Auth0's token endpoint
  const tokenResponse = await fetch(
    `${process.env.AUTH0_DOMAIN}/oauth/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        code,
        redirect_uri: process.env.BASE_URL + "/callback",
      }),
    }
  );

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    console.error("Token Exchange Error:", tokenData);
    return c.text("Authentication failed", 400);
  }

  const idToken = tokenData.id_token;

  // Optionally verify the ID Token here (redundant if you trust Auth0)
  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: `${process.env.AUTH0_DOMAIN}/`,
      audience: process.env.AUTH0_CLIENT_ID,
    });

    // Set the ID Token in a secure, HTTP-only cookie
    await setSession(c, idToken);

    // Redirect to the homepage or desired location
    return c.redirect("/");
  } catch (err) {
    console.error("ID Token Verification Error:", err);
    return c.text("Authentication failed", 400);
  }
});

auth.get("/logout", async (c) => {
  await clearSession(c);

  // Redirect to Auth0's logout endpoint to terminate the session on the Identity Provider
  const logoutURL = `${process.env.AUTH0_DOMAIN}/v2/logout?client_id=${process.env.AUTH0_CLIENT_ID}&returnTo=${process.env.BASE_URL}`;

  return c.redirect(logoutURL);
});

auth.get("/login", (c) => {
  // Redirect to Auth0's authorization endpoint
  const authURL =
    `${process.env.AUTH0_DOMAIN}/authorize?` +
    `response_type=code&` +
    `client_id=${process.env.AUTH0_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.BASE_URL + "/auth/callback")}&` +
    `scope=openid profile email`;

  return c.redirect(authURL);
});

export default auth;
