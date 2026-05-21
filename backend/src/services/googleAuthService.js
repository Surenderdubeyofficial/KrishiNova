import { OAuth2Client } from "google-auth-library";

let client;

function getClient() {
  if (!client) {
    client = new OAuth2Client();
  }
  return client;
}

function getAllowedAudiences() {
  return Array.from(
    new Set(
      [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_WEB_CLIENT_ID]
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

export async function verifyGoogleCredential(credential) {
  const audiences = getAllowedAudiences();
  if (!audiences.length) {
    return {
      ok: false,
      reason: "Google sign-in is not configured",
    };
  }

  let ticket;
  try {
    ticket = await getClient().verifyIdToken({
      idToken: credential,
      audience: audiences,
    });
    const payload = ticket.getPayload();
    return buildGoogleProfileResult(payload);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Google auth library verification failed", error?.message || error);
    }
  }

  try {
    const tokenInfo = await verifyWithTokenInfo(credential, audiences);
    return buildGoogleProfileResult(tokenInfo);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Google tokeninfo verification failed", error?.message || error);
    }

    return {
      ok: false,
      reason: error?.code === "GOOGLE_AUDIENCE_MISMATCH"
        ? "Google OAuth client mismatch. Use the same web client ID in frontend and backend."
        : "Invalid Google credential",
    };
  }
}

async function verifyWithTokenInfo(credential, audiences) {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
  );

  const tokenInfo = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(tokenInfo?.error_description || tokenInfo?.error || "Tokeninfo rejected Google credential");
  }

  if (!audiences.includes(tokenInfo.aud)) {
    const error = new Error("Google credential audience does not match configured client ID");
    error.code = "GOOGLE_AUDIENCE_MISMATCH";
    throw error;
  }

  return tokenInfo;
}

function buildGoogleProfileResult(payload) {
  const emailVerified = payload?.email_verified === true || payload?.email_verified === "true";
  if (!payload?.email || !emailVerified) {
    return {
      ok: false,
      reason: "Google account email is not verified",
    };
  }

  return {
    ok: true,
    profile: {
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture || null,
      sub: payload.sub,
    },
  };
}
