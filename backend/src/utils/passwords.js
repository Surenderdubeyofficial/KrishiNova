import bcrypt from "bcryptjs";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(inputPassword, storedPassword) {
  if (!storedPassword) {
    return false;
  }

  // Keep existing plaintext database records working while allowing hashed registrations.
  if (storedPassword === inputPassword) {
    return true;
  }

  if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {
    return bcrypt.compare(inputPassword, storedPassword);
  }

  return false;
}
