import { useState, useMemo } from 'react'
import Upload from './components/Upload'
import Table from './components/Table'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import './App.css'

const STATUS_VALIDOS = [
  'encaminhada',
  'em transferência',
  'em campo',
  'reencaminhado',
  'proced. técnico'
]

const COLUNAS = [
  'Origem',
  'Chamado',
  'Numero Referencia',
  'Contratante',
  'Serviço',
  'Status',
  'Data Limite',
  'Cliente',
  'CNPJ / CPF',
  'Cidade',
  'Técnico',
  'Prestador',
  'Justificativa do Abono'
]

function App() {
  const [data, setData] = useState(null)
  const [filteredData, setFilteredData] = useState(null)
  const [filtros, setFiltros] = useState(
    Object.fromEntries(COLUNAS.map(c => [c, []]))
  )

  function parseDataBR(str) {
    if (!str) return null
    const partes = str.split('/')
    if (partes.length !== 3) return null
    const [d, m, a] = partes.map(Number)
    return new Date(a, m - 1, d)
  }

  function statusOk(status) {
    return STATUS_VALIDOS.some(v =>
      String(status).toLowerCase().includes(v)
    )
  }

  const handleUploadSuccess = (dados) => {
    const filtrados = dados.filter(row => statusOk(row.Status))
    setData(filtrados)
    setFilteredData(filtrados)
    setFiltros(Object.fromEntries(COLUNAS.map(c => [c, []])))
  }

  useMemo(() => {
    if (!data) return

    let resultado = [...data]

    Object.keys(filtros).forEach(col => {
      const selecionados = filtros[col]
      if (!selecionados || selecionados.length === 0) return

      resultado = resultado.filter(row => {
        const valor = row[col] || ''
        const vazio = !valor || String(valor).trim() === ''
        const querVazio = selecionados.includes('(Vazio)')

        if (vazio && querVazio) return true

        const outros = selecionados.filter(v => v !== '(Vazio)')
        return outros.some(v =>
          String(valor).toLowerCase() === String(v).toLowerCase()
        )
      })
    })

    resultado.sort((a, b) => {
      const dA = parseDataBR(a['Data Limite'])
      const dB = parseDataBR(b['Data Limite'])
      if (!dA && !dB) return 0
      if (!dA) return 1
      if (!dB) return -1
      return dA - dB
    })

    setFilteredData(resultado)
  }, [filtros, data])

  const limparFiltros = () => {
    setFiltros(Object.fromEntries(COLUNAS.map(c => [c, []])))
  }

  const hasData = filteredData && filteredData.length > 0
  const temFiltrosAtivos = Object.values(filtros).some(v => v.length > 0)

  async function exportarPendencias() {
    if (!filteredData?.length) {
      alert('Nenhum dado para exportar.')
      return
    }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const pend = filteredData.filter(row => {
      const d = parseDataBR(row['Data Limite'])
      return d && d <= hoje
    })

    const pendFinal = pend.filter(r => statusOk(r.Status))

    if (!pendFinal.length) {
      alert('Nenhuma OS pendente para exportar.')
      return
    }

    const workbook = new ExcelJS.Workbook()
    const ws = workbook.addWorksheet('Pendências')

    ws.columns = COLUNAS.map(key => ({
      header: key,
      key,
      width: Math.min(
        Math.max(key.length, ...pendFinal.map(r => String(r[key] || '').length)) + 2,
        40
      )
    }))

    ws.getRow(1).eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF274472' }
      }
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    pendFinal.forEach(row => {
      ws.addRow(COLUNAS.map(c => row[c] || ''))
    })

    const hojeBR = hoje.toLocaleDateString('pt-BR')

    for (let i = 2; i <= ws.rowCount; i++) {
      const row = ws.getRow(i)
      const registro = pendFinal[i - 2]
      const dataBr = registro['Data Limite']
      const d = parseDataBR(dataBr)

      let cor = (i % 2 === 0) ? 'FFF9F9F9' : 'FFFFFFFF'

      if (d) {
        if (d < hoje) cor = 'FFFAD4D4'
        else if (dataBr === hojeBR) cor = 'FFFFF8E1'
      }

      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cor } }
        cell.font = { color: { argb: 'FF000000' }, size: 10 }
        cell.alignment = { vertical: 'middle', horizontal: 'left' }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        }
      })
    }

    ws.views = [{ state: 'frozen', ySplit: 1 }]

    const buffer = await workbook.xlsx.writeBuffer()
    saveAs(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }),
      `pendencias_mob_${new Date().toISOString().slice(0, 10)}.xlsx`
    )
  }

  return (
    <div className={`App ${hasData ? 'tabela-visivel' : ''}`}>
      {!hasData ? (
        <>
          <header>
            <h1>MOBYAN - Gestão de Chamados</h1>
            <p>Painel automático de priorização e acompanhamento</p>
          </header>

          <div className="upload-container">
            <Upload onUpload={handleUploadSuccess} />
          </div>
        </>
      ) : (
        <>
          <header>
            <h1>MOBYAN - Gestão de Chamados</h1>
          </header>

          <div className="actions">
            <button className="download" onClick={exportarPendencias}>
              📥 Exportar Pendências
            </button>
            <button onClick={() => {
              setData(null)
              setFilteredData(null)
            }}>
              🔄 Novo Upload
            </button>
            {temFiltrosAtivos && (
              <button className="limpar-filtros" onClick={limparFiltros}>
                ✖ Limpar Filtros
              </button>
            )}
          </div>

          <div className="info-registros">
            Mostrando <strong>{filteredData?.length || 0}</strong> registros
          </div>

          <Table
            data={filteredData}
            allData={data}
            filtros={filtros}
            setFiltros={setFiltros}
          />
        </>
      )}
    </div>
  )
}

export default App
