import { useState, useMemo } from 'react'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import './App.css'
import Upload from './components/Upload'
import Table from './components/Table'

// As 13 colunas oficiais
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

// Status permitidos
const STATUS_OK = [
  'em transferência',
  'em campo',
  'encaminhada',
  'reencaminhado',
  'proced. técnico'
]

// Normalizar datas dd/mm/aaaa
function parseDataBR(str) {
  if (!str) return null
  const partes = str.split('/')
  if (partes.length !== 3) return null
  const [d, m, a] = partes
  const dt = new Date(a, m - 1, d)
  return isNaN(dt) ? null : dt
}

function App() {
  const [data, setData] = useState(null)
  const [filteredData, setFilteredData] = useState(null)

  // Monta filtros por coluna automaticamente
  const [filtros, setFiltros] = useState(
    Object.fromEntries(COLUNAS.map(c => [c, []]))
  )

  function statusOk(s) {
    return STATUS_OK.includes(String(s).trim().toLowerCase())
  }

  // Quando o upload termina
  function handleUploadSuccess(rows) {
    const permitidas = rows.filter(r => statusOk(r.Status))
    const base = permitidas.length > 0 ? permitidas : rows

    setData(base)
    setFilteredData(base)

    // Reinicia filtros
    setFiltros(Object.fromEntries(COLUNAS.map(c => [c, []])))
  }

  // Atualiza tabela quando filtros mudam
  useMemo(() => {
    if (!data) return

    let filtroBase = [...data]

    Object.keys(filtros).forEach(col => {
      const selecionados = filtros[col]
      if (!selecionados.length) return

      filtroBase = filtroBase.filter(row => {
        const valor = row[col] ?? ''
        const vazio = valor === ''
        const querVazio = selecionados.includes('(Vazio)')
        if (vazio && querVazio) return true

        const outros = selecionados.filter(v => v !== '(Vazio)')
        return outros.some(v =>
          String(valor).toLowerCase() === String(v).toLowerCase()
        )
      })
    })

    setFilteredData(filtroBase)
  }, [filtros, data])

  const limparFiltros = () =>
    setFiltros(Object.fromEntries(COLUNAS.map(c => [c, []])))

  const hasData = filteredData && filteredData.length > 0
  const temFiltrosAtivos = Object.values(filtros).some(v => v.length > 0)

  // Exportação Excel
  async function exportarPendencias() {
    if (!filteredData?.length) {
      alert('Nenhum dado para exportar.')
      return
    }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    // Só Data Limite vencida ou hoje
    const pend = filteredData.filter(row => {
      const d = parseDataBR(row['Data Limite'])
      return d && d <= hoje
    })

    // Apenas status permitidos
    const pendFinal = pend.filter(r => statusOk(r.Status))

    if (!pendFinal.length) {
      alert('Nenhuma OS para exportar.')
      return
    }

    const workbook = new ExcelJS.Workbook()
    const ws = workbook.addWorksheet('Pendências')

    // Cabeçalho
    ws.addRow(COLUNAS)

    // Ajuste de largura
    ws.columns = COLUNAS.map(key => ({
      header: key,
      key,
      width: Math.min(
        Math.max(key.length, ...pendFinal.map(r => String(r[key] || '').length)) + 2,
        40
      )
    }))

    // Estilo do cabeçalho
    ws.getRow(1).eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF274472' }
      }
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    // Corpo
    pendFinal.forEach(row => {
      ws.addRow(COLUNAS.map(c => row[c] || ''))
    })

    const buf = await workbook.xlsx.writeBuffer()
    saveAs(
      new Blob([buf], {
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
            <h1>Sistema Mob – Painel de Chamados</h1>
            <p>Envie o relatório para visualizar e filtrar dados.</p>
          </header>

          <div className="upload-container">
            <Upload onUpload={handleUploadSuccess} />
          </div>
        </>
      ) : (
        <>
          <header>
            <h1>Sistema Mob – Painel de Chamados</h1>
          </header>

          <div className="actions">
            <button className="download" onClick={exportarPendencias}>
              📥 Exportar Pendências
            </button>
            <button onClick={() => (setData(null), setFilteredData(null))}>
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
