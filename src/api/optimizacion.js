import { API_BASE_URL } from "../config";

async function wakeBackend() {
  try {
    await fetch(`${API_BASE_URL}/ping`, { method: "GET" });
  } catch (err) {
      console.warn("Intento de wakeBackend fallido:", err);
  }
}

export async function optimizeFile(cliente, venta, file) {
  await wakeBackend();
  const url = `${API_BASE_URL}/optimizar/${cliente}/${venta}`;
  const fd = new FormData();
  fd.append('file', file);

  const resp = await fetch(url, { method: 'POST', body: fd });
  if (!resp.ok) {
    // Leer detalle de error (viene en resp.status y resp.json().detail o .text())
    let msg;
    try {
      const err = await resp.json();
      msg = err.detail || JSON.stringify(err);
    } catch {
      msg = await resp.text();
    }
    throw new Error(msg || `Error ${resp.status}`);
  }
  return resp.json();
}
