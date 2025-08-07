import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export async function exportToExcel(resultado, activeOpt, cliente) {
    if (!resultado || !activeOpt) return
    const actuales = resultado[activeOpt]
    const camiones = Array.isArray(actuales.camiones) ? actuales.camiones : []

    const headers = [
      'Unidad', 'CD', 'Solic.', 'Número PO', 'Nº pedido',
      'Fecha preferente de entrega', 'Clasificación OC', 'Ce.',
      'Cant. Sol.', 'CJ Conf.', 'Suma de Sol (Pallet)',
      'Suma de Conf (Pallet)',
      'Suma de  Volumen CONF', 'Suma de Peso bruto conf',
      'Suma de Valor neto CONF', '%NS'
    ]

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Armado')

    camiones.forEach(cam => {
      // Composición de metadatos de encabezado
      const cdFull = cam.pedidos[0]?.CD || ''
      const cdName = cdFull.replace(/^\d+\s*/, '')
      const flujoOc = cam.flujo_oc || ''
      const solicitarBh = cam.tipo_ruta === 'bh' ? 'SOLICITAR BH' : ''
      const paquetera = cam.pos_total > 28 ? 'PAQUETERA' : ''
      const tieneChocolate = cam.chocolates === 'SI'
      const skuValioso = cam.skus_valiosos
      const pdq = cam.pdq
      const esCencosud = cliente === 'Cencosud'
      const comentarioPDQ = cliente == 'Cencosud' || cliente == 'Walmart'
      const comentarios = [cdName, flujoOc, solicitarBh, paquetera, tieneChocolate ? 'CHOCOLATES' : null,
        esCencosud && skuValioso ? 'SKU Valioso' : null, pdq && comentarioPDQ ? 'PDQ' : null
      ].filter(Boolean).join(' - ')
      const regionalCities = ['Chillán', 'Temuco', 'Antofagasta']
      const tipoViaje = regionalCities.some(city => cdName.includes(city)) ? 'Bodega Regional' : 'Bodega Central'
      const backHaulFlag = cam.tipo_ruta === 'bh' ? 'SI' : 'NO'

      
      const metaRows = [
        ['COMENTARIOS', comentarios],
        ['TIPO DE VIAJE', tipoViaje],
        ['BACK HAUL', backHaulFlag]
      ]
      metaRows.forEach(rowArr => {
        const row = ws.addRow(rowArr)
        for (let i = 1; i <= 5; i++) {
          row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }
        }
      })

      ws.addRow([])
      const headerRow = ws.addRow(headers)

      headerRow.font = { bold: true }
      for (let i = 1; i <= headers.length; i++) {
        const cell = headerRow.getCell(i)
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      }

      (cam.pedidos || []).forEach(p => {
        const rowValues = [
          cam.numero,
          p.CD,
          p['Solic.'],
          p.PO || p['Número PO'],
          p.PEDIDO,
          p['Fecha preferente de entrega'],
          p.OC,
          p.CE,
          Number(p['Cant. Sol.'] || 0),
          Number(p['CJ Conf.'] || 0),
          Number((p['Suma de Sol (Pallet)'] || 0).toFixed(2)),
          p.PALLETS,
          Number((p.VOL || 0).toFixed(0)),
          Number((p.PESO || 0).toFixed(0)),
          p.VALOR || p['Suma de Valor neto CONF'] || 0,
          Number((p['%NS'] || 0) * 100).toFixed(0) / 100
        ]
        const row = ws.addRow(rowValues)
        row.getCell(15).numFmt = '[$$-es-CL]#,##0'
        row.eachCell(cell => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        })
      })
      ws.addRow([])
      ws.addRow([])
    })


    const buf = await wb.xlsx.writeBuffer()
    saveAs(new Blob([buf]), `armado_camiones_${activeOpt}.xlsx`)
}