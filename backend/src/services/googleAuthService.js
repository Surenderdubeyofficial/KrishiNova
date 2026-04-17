import { OAuth2Client } from "google-auth-library";

let client;

function getClient() {
  if (!client) {
    client = new OAuth2Client();
  }
  return client;
}

function getAllowedAudiences() {
  return [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_WEB_CLIENT_ID].filter(Boolean);
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
  } catch {
    return {
      ok: false,
      reason: "Invalid Google credential",
    };
  }

  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) {
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
