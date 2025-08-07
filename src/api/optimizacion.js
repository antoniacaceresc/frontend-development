import { API_BASE_URL } from "../config";

// Despertar backend
async function wakeBackend() {
  try {
    await fetch(`${API_BASE_URL}/ping`, { method: "GET" });
  } catch (err) {
    console.warn("Intento de wakeBackend fallido:", err);
  }
}

// Optimizar rutas
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

// Mover pedido
export async function postProcessMove(pedidos, targetTruckId, optData) {
  const url = `${API_BASE_URL}/postprocess/move_orders`;
  const body = {
    camiones: optData.camiones,
    pedidos_no_incluidos: optData.pedidos_no_incluidos,
    pedidos,
    target_truck_id: targetTruckId
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await resp.json();
  if (!resp.ok) {
    // data.detail es un array de errores o un string
    const msg = Array.isArray(data.detail)
      ? data.detail.map(e => e.msg || JSON.stringify(e)).join('\n')
      : data.detail || JSON.stringify(data);
    throw new Error(msg);
  }
  return data;
}


// Agregar camión
export async function postProcessAddTruck(cd, ce, ruta, optData) {
  const url = `${API_BASE_URL}/postprocess/add_truck`;
  const body = {
    camiones: optData.camiones,
    pedidos_no_incluidos: optData.pedidos_no_incluidos,
    cd,
    ce,
    ruta
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || JSON.stringify(data));
  return data;
}

// Eliminar camión
export async function postProcessDeleteTruck(truckId, optData) {
  const url = `${API_BASE_URL}/postprocess/delete_truck`;
  const body = {
    camiones: optData.camiones,
    pedidos_no_incluidos: optData.pedidos_no_incluidos,
    target_truck_id: truckId
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || JSON.stringify(data));
  return data;
}

// Recalcular estadísticas
export async function postProcessComputeStats(optData) {
  const url = `${API_BASE_URL}/postprocess/compute_stats`;
  const body = {
    camiones: optData.camiones,
    pedidos_no_incluidos: optData.pedidos_no_incluidos
  };
  console.log(body)
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || JSON.stringify(data));
  return data;
}

