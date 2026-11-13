
import { Entry } from "@napi-rs/keyring";

const SERVICE_NAME = "CFDI Local Agent";

const TOKEN_ACCOUNT = "agent-token";
const DEVICE_ACCOUNT = "device-id";

const FIEL_CERT_ACCOUNT = "fiel-cert-path";
const FIEL_KEY_ACCOUNT = "fiel-key-path";
const FIEL_PASSWORD_ACCOUNT = "fiel-password";

function ensureWindows() {
  if (process.platform !== "win32") {
    throw new Error(
      "El almacenamiento seguro está configurado para Windows."
    );
  }
}

function getEntry(account: string) {
  return new Entry(SERVICE_NAME, account);
}

export function saveAgentCredentials(
  token: string,
  deviceId: string
) {
  ensureWindows();

  if (!token || !deviceId) {
    throw new Error("Credenciales incompletas.");
  }

  getEntry(DEVICE_ACCOUNT).setPassword(deviceId);
  getEntry(TOKEN_ACCOUNT).setPassword(token);
}

export function getAgentCredentials() {
  ensureWindows();

  const token = getEntry(TOKEN_ACCOUNT).getPassword();
  const deviceId = getEntry(DEVICE_ACCOUNT).getPassword();

  if (!token || !deviceId) {
    return null;
  }

  return { token, deviceId };
}

export function deleteAgentCredentials() {
  ensureWindows();

  getEntry(TOKEN_ACCOUNT).deletePassword();
  getEntry(DEVICE_ACCOUNT).deletePassword();
}

export function saveFielCredentials(
  certPath: string,
  keyPath: string,
  password: string
) {
  ensureWindows();

  if (!certPath || !keyPath || !password) {
    throw new Error("Los datos de la e.firma están incompletos.");
  }

  getEntry(FIEL_CERT_ACCOUNT).setPassword(certPath);
  getEntry(FIEL_KEY_ACCOUNT).setPassword(keyPath);
  getEntry(FIEL_PASSWORD_ACCOUNT).setPassword(password);
}

export function getFielCredentials() {
  ensureWindows();

  const certPath = getEntry(FIEL_CERT_ACCOUNT).getPassword();
  const keyPath = getEntry(FIEL_KEY_ACCOUNT).getPassword();
  const password = getEntry(FIEL_PASSWORD_ACCOUNT).getPassword();

  if (!certPath || !keyPath || !password) {
    return null;
  }

  return {
    certPath,
    keyPath,
    password,
  };
}

export function deleteFielCredentials() {
  ensureWindows();

  getEntry(FIEL_CERT_ACCOUNT).deletePassword();
  getEntry(FIEL_KEY_ACCOUNT).deletePassword();
  getEntry(FIEL_PASSWORD_ACCOUNT).deletePassword();
}
