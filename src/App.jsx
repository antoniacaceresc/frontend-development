import React, { useState } from 'react'
import ClientSelector from './components/ClientSelector'
import FileUploader from './components/FileUploader'
import StatsPanel from './components/StatsPanel'
import TruckGroup from './components/TruckGroup'
import Header from './components/Header'
import { optimizeFile, postProcessMove, postProcessAddTruck, postProcessDeleteTruck, postProcessComputeStats } from './api/optimizacion'
import { exportToExcel } from './components/ExportToExcel'

const CLIENTES = ['Walmart', 'Cencosud', 'Disvet']
const VENTAS = ['Secos', 'Purina']

export default function App() {
  const [cliente, setCliente] = useState('')
  const [venta, setVenta] = useState('')
  const [file, setFile] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [activeOpt, setActiveOpt] = useState(null)
  const [selectedPedidos, setSelectedPedidos] = useState([])
  const [loading, setLoading] = useState(false)
  const [showUploadPanel, setShowUploadPanel] = useState(true);


  const submit = async () => {
    if (!cliente || !venta || !file) return
    setLoading(true)
    try {
      const data = await optimizeFile(cliente, venta, file)
      console.log('Respuesta completa del backend', data)
      console.log('Camiones VCU:', data.vcu?.camiones?.length)
      console.log('Camiones Binpacking:', data.binpacking?.camiones?.length)
      // Asegurarnos de que vcu y binpacking existan
      const vcuData = data.vcu || { camiones: [], pedidos_no_incluidos: [] }
      const binData = data.binpacking || { camiones: [], pedidos_no_incluidos: [] }

      // Asignar número secuencial inicial a cada camión
      vcuData.camiones = vcuData.camiones.map((cam, i) => ({ ...cam, numero: i + 1 }))
      binData.camiones = binData.camiones.map((cam, i) => ({ ...cam, numero: i + 1 }))

      // Calcular estadísticas iniciales
      vcuData.estadisticas = await postProcessComputeStats(vcuData)
      binData.estadisticas = await postProcessComputeStats(binData)

      // Reasignar objetos modificados
      data.vcu = vcuData
      data.binpacking = binData

      setResultado(data)
      setActiveOpt(null)
    } catch (err) {
      let message = ''
      if (err.response && err.response.data && err.response.data.detail) {
        if (typeof err.response.data.detail === 'string') {
          message += err.response.data.detail
        } else if (typeof err.response.data.detail === 'object' && err.response.data.detail.message) {
          message += err.response.data.detail.message
        } else {
          message += JSON.stringify(err.response.data.detail)
        }
      } else {
        message += err.message
      }
      alert(message)
    } finally {
      setLoading(false)
      setShowUploadPanel(false);
    }
  }

  const computeStats = async () => {
    try {
      const dataOpt = resultado[activeOpt];
      const stats = await postProcessComputeStats(dataOpt);
      setResultado(prev => ({
        ...prev,
        [activeOpt]: {
          ...prev[activeOpt],
          estadisticas: stats
        }
      }));
    } catch (err) {
      alert(`Error recalculando estadísticas:\n${err.message}`);
    }
  };

  /*
    const computeStats = (camiones, pedidosNoIncluidos) => {
      const cantidad_camiones = camiones.length
      const cantidad_normal = camiones.filter(c => c.tipo_camion !== 'bh').length
      const cantidad_bh = camiones.filter(c => c.tipo_camion === 'bh').length
      const cantidad_pedidos_asignados = camiones.reduce((sum, c) => sum + (c.pedidos?.length || 0), 0)
      const total_pedidos = cantidad_pedidos_asignados + pedidosNoIncluidos.length
  
      const promedio_vcu_normal = cantidad_normal
        ? camiones
          .filter(c => c.tipo_camion !== 'bh')
          .reduce((sum, c) => sum + (c.vcu_max || 0), 0) / cantidad_normal
        : 0
  
      const promedio_vcu_bh = cantidad_bh
        ? camiones
          .filter(c => c.tipo_camion === 'bh')
          .reduce((sum, c) => sum + (c.vcu_max || 0), 0) / cantidad_bh
        : 0
  
      const promedio_vcu = cantidad_camiones
        ? camiones
          .reduce((sum, c) => sum + (c.vcu_max || 0), 0) / cantidad_camiones
        : 0
  
      const valorizado = camiones.reduce((sum, c) => sum + (c.valor_total || 0), 0)
  
      return {
        cantidad_camiones,
        cantidad_camiones_normal: cantidad_normal,
        cantidad_camiones_bh: cantidad_bh,
        cantidad_pedidos_asignados,
        total_pedidos,
        promedio_vcu,
        promedio_vcu_normal,
        promedio_vcu_bh,
        valorizado,
      }
    }
  */
  const vcuOpt = resultado?.vcu || { camiones: [], estadisticas: {}, pedidos_no_incluidos: [] }
  const binOpt = resultado?.binpacking || { camiones: [], estadisticas: {}, pedidos_no_incluidos: [] }

  const camionesActivos = activeOpt === 'vcu' ? vcuOpt.camiones : binOpt.camiones
  const pedidosNoIncluidos = activeOpt === 'vcu' ? vcuOpt.pedidos_no_incluidos : binOpt.pedidos_no_incluidos

  const normalizeCdList = arr =>
    Array.isArray(arr)
      ? arr.map(x => String(x).trim()).sort().join(',')
      : String(arr).trim()

  const normalizeCeList = arr =>
    Array.isArray(arr)
      ? arr.map(x => String(x).replace(/^0+/, '')).sort().join(',')
      : String(arr).replace(/^0+/, '')


  const cdCeTuples = new Set()

  camionesActivos.forEach(cam => {
    const cdsArr = Array.isArray(cam.cd) ? cam.cd.map(s => String(s).trim()).sort() : [String(cam.cd).trim()]
    const cesArr = Array.isArray(cam.ce) ? cam.ce.map(s => String(s).replace(/^0+/, '')).sort() : [String(cam.ce).replace(/^0+/, '')]
    if (cdsArr[0] && cesArr[0]) {
      const key = `${cdsArr.join(',')}|||${cesArr.join(',')}`
      cdCeTuples.add(key)
    }
  })

  pedidosNoIncluidos.forEach(p => {
    const cdsArr = [String(p.CD).trim()]
    const cesArr = [String(p.CE).replace(/^0+/, '')]
    if (cdsArr[0] && cesArr[0]) {
      const key = `${cdsArr.join(',')}|||${cesArr.join(',')}`
      cdCeTuples.add(key)
    }
  })

  let cdCeList = Array.from(cdCeTuples).map(tuple => {
    const [cdsStr, cesStr] = tuple.split('|||')
    return { cds: cdsStr.split(','), ces: cesStr.split(',') }
  })

  cdCeList.sort((a, b) => {
    const aCdsJoined = a.cds.join(',')
    const bCdsJoined = b.cds.join(',')
    if (aCdsJoined < bCdsJoined) return -1
    if (aCdsJoined > bCdsJoined) return 1
    return Number(a.ces[0]) - Number(b.ces[0])
  })

  const moveOrders = async (pedidos, { targetTruckId }) => {
    try {
      const dataOpt = resultado[activeOpt];
      const updated = await postProcessMove(pedidos, targetTruckId, dataOpt);
      setResultado(prev => ({
        ...prev,
        [activeOpt]: updated
      }));
      setSelectedPedidos([]); // limpia selección
    } catch (err) {
      alert(`Error moviendo pedidos:\n${err.message}`);
    }
  };


  const onSelectPedido = pedido => {
    setSelectedPedidos(sel => {
      const exists = sel.some(x => x.PEDIDO === pedido.PEDIDO)
      return exists ? sel.filter(x => x.PEDIDO !== pedido.PEDIDO) : [...sel, pedido]
    })
  }

  const addTruck = async (cd, ce, ruta) => {
    try {
      const dataOpt = resultado[activeOpt];
      const updated = await postProcessAddTruck(cd, ce, ruta, dataOpt);
      setResultado(prev => ({ ...prev, [activeOpt]: updated }));
    } catch (err) {
      alert(`Error agregando camión:\n${err.message}`);
    }
  };


  const deleteTruck = async (truckId) => {
    try {
      const dataOpt = resultado[activeOpt];
      const updated = await postProcessDeleteTruck(truckId, dataOpt);
      setResultado(prev => ({ ...prev, [activeOpt]: updated }));
    } catch (err) {
      alert(`Error eliminando camión:\n${err.message}`);
    }
  };

  return (
    <div className="app">
      <Header />
      <div className="body">
        <div className="upload-section">

          <div className="upload-section-row">
            <div
              className="plus-button-small"
              onClick={() => setShowUploadPanel(prev => !prev)}
              title="Mostrar/Ocultar configuraciones"
            >
              +
            </div>

            {showUploadPanel && (
              <div className="upload-panel">
                <div className="upload-group">
                  <ClientSelector label="Cliente" options={CLIENTES} value={cliente} onChange={setCliente} />
                </div>
                <div className="upload-group">
                  <ClientSelector label="Venta" options={VENTAS} value={venta} onChange={setVenta} />
                </div>
                <div className="upload-group">
                  <FileUploader file={file} onChange={setFile} />
                </div>
                <button className="btn-primary" onClick={submit} disabled={!cliente || !venta || !file}>
                  Subir y optimizar
                </button>
              </div>
            )}
          </div>

        </div>

        {loading && (
          <div className="spinner-container">
            <div className="spinner" />
          </div>
        )}

        {!loading && resultado && (
          <>
            <div className="stats-row">
              <StatsPanel
                mode="vcu"
                title="VCU"
                stats={vcuOpt.estadisticas}
                active={activeOpt === 'vcu'}
                onClick={() => setActiveOpt('vcu')}
              />
              <StatsPanel
                mode="bin"
                title="Bin Packing"
                stats={binOpt.estadisticas}
                active={activeOpt === 'binpacking'}
                onClick={() => setActiveOpt('binpacking')}
              />
            </div>

            {activeOpt && (
              <div className="cd-block-container">

                {cdCeList.map(({ cds, ces }) => {

                  const trucks = camionesActivos.filter(cam => {
                    const camCdsNorm = normalizeCdList(cam.cd)
                    const camCesNorm = normalizeCeList(cam.ce)
                    const cdsNorm = normalizeCdList(cds)
                    const cesNorm = normalizeCeList(ces)
                    return camCdsNorm === cdsNorm && camCesNorm === cesNorm
                  })

                  const cdsNorm = normalizeCdList(cds)
                  const cesNorm = normalizeCeList(ces)

                  const unassigned = pedidosNoIncluidos.filter(p => {
                    return (
                      normalizeCdList(p.CD) === cdsNorm &&
                      normalizeCeList(p.CE) === cesNorm
                    )
                  })

                  if (trucks.length === 0 && unassigned.length === 0) return null

                  // Derivar ruta dominante: si todos los trucks comparten tipo_ruta, usarlo; si hay mezcla, fallback a 'normal'
                  const ruta = trucks[0]?.tipo_ruta || 'normal'

                  return (
                    <React.Fragment key={`${cds.join(',')}__${ces.join(',')}__${ruta}`}>
                      <h2 className="cd-title">
                        Ruta  CE {ces.join(', ')} - CD {cds.join(', ')}
                      </h2>
                      <TruckGroup
                        cd={cds}
                        ce={ces}
                        camiones={trucks}
                        unassigned={unassigned}
                        selectedPedidos={selectedPedidos}
                        onSelectPedido={onSelectPedido}
                        moveOrders={moveOrders}
                        onAddTruck={addTruck}
                        onDeleteTruck={deleteTruck}
                        ruta={ruta}
                      />
                    </React.Fragment>
                  )
                })}
              </div>
            )}
          </>
        )}

        {!loading && resultado && activeOpt && (
          <div className="download-row">
            <button className="export-btn" onClick={() => exportToExcel(resultado, activeOpt, cliente)}>
              📥 Exportar armado a Excel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
