import { useState, useMemo } from 'react'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import './App.css'
import Upload from './components/Upload'
import Table from './components/Table'

function App() {
  const [data, setData] = useState(null)
  const [filteredData, setFilteredData] = useState(null)
  const [filtros, setFiltros] = useState({
    Status: [],
    Serviço: [],
    'Data Limite': [],
    Cliente: [],
    Técnico: [],
    Prestador: [],
    'Justificativa do Abono': []
  })

  // --------- STATUS PERMITIDOS ---------
  const statusPermitidosBase = [
    'em transferência',
    'em campo',
    'encaminhada',
    'reencaminhado',
    'proced. técnico'
  ]

  function statusEhPermitido(statusBruto) {
    const s = String(statusBruto || '').trim().toLowerCase()
    return statusPermitidosBase.includes(s)
  }

  // --------- HELPERS DE DATA E CPF/CNPJ ---------

  function formatarDataSomenteDia(valor) {
    if (!valor) return ''
    let v = String(valor).trim()
    if (v.includes(' ')) v = v.split(' ')[0]
    if (v.includes('-')) {
      const partes = v.split('T')[0].split('-')
      if (partes.length === 3) {
        const [ano, mes, dia] = partes
        return `${dia}/${mes}/${ano}`
      }
    }
    return v
  }

  function parseDataBR(str) {
    if (!str) return null
    const partes = str.split('/')
    if (partes.length !== 3) return null
    const [dia, mes, ano] = partes
    const d = new Date(Number(ano), Number(mes) - 1, Number(dia))
    if (isNaN(d.getTime())) return null
    return d
  }

  function limparCpfCnpj(valor) {
    if (!valor) return ''
    let v = String(valor)
    v = v.split('=').join('')
    v = v.split('"').join('')
    if (v.charAt(0) === "'") {
      v = v.substring(1)
    }
    return v.trim()
  }

  // --------- UPLOAD ---------

  const handleUploadSuccess = (rows) => {
    const apenasStatusPermitidos = rows.filter(r => statusEhPermitido(r.Status))
    const base = apenasStatusPermitidos.length > 0 ? apenasStatusPermitidos : rows

    setData(base)
    setFilteredData(base)

    setFiltros({
      Status: [],
      Serviço: [],
      'Data Limite': [],
      Cliente: [],
      Técnico: [],
      Prestador: [],
      'Justificativa do Abono': []
    })
  }

  // --------- FILTROS DA TABELA ---------

  useMemo(() => {
    if (!data) {
      setFilteredData(null)
      return
    }
    let resultado = [...data]
    Object.keys(filtros).forEach(coluna => {
      const selecionados = filtros[coluna]
      if (!selecionados || selecionados.length === 0) return
      resultado = resultado.filter(row => {
        const valor = row[coluna]
        const vazio = !valor || String(valor).trim() === ''
        const querVazio = selecionados.includes('(Vazio)')
        if (vazio && querVazio) return true
        const outros = selecionados.filter(v => v !== '(Vazio)')
        if (!valor) return false
        return outros.some(v => String(valor).toLowerCase() === String(v).toLowerCase())
      })
    })
    setFilteredData(resultado)
  }, [data, filtros])

  const hasData = Array.isArray(filteredData) && filteredData.length > 0
  const temFiltrosAtivos = Object.values(filtros).some(f => f.length > 0)

  const limparFiltros = () => {
    setFiltros({
      Status: [],
      Serviço: [],
      'Data Limite': [],
      Cliente: [],
      Técnico: [],
      Prestador: [],
      'Justificativa do Abono': []
    })
    setFilteredData(data)
  }

  // --------- EXPORTAR PENDÊNCIAS COM EXCELJS ---------

  const exportarFiltrado = async () => {
    if (!filteredData || filteredData.length === 0) {
      alert('Nenhum dado para exportar')
      return
    }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const soPendencias = filteredData.filter(row => {
      const dataBr = formatarDataSomenteDia(row['Data Limite'])
      const d = parseDataBR(dataBr)
      if (!d) return false
      return d <= hoje
    })

    if (soPendencias.length === 0) {
      alert('Nenhuma OS com Data Limite de hoje ou atrasada.')
      return
    }

    const soStatusPermitidos = soPendencias.filter(row => statusEhPermitido(row.Status))
    if (soStatusPermitidos.length === 0) {
      alert('Nenhuma OS com status permitido para exportar.')
      return
    }

    const dados = soStatusPermitidos

    // ✅ COLUNAS NA ORDEM CERTA (sem Prioridade, só as 7 principais)
    const headers = [
      'Status',
      'Serviço',
      'Data Limite',
      'Cliente',
      'Técnico',
      'Prestador',
      'Justificativa do Abono'
    ]

    // ------ CRIA WORKBOOK / WORKSHEET ------
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Pendências do Dia')

    // ------ LINHA DE CABEÇALHO ------
    worksheet.addRow(headers)

    // estilos básicos de coluna
    worksheet.columns = headers.map(h => ({
      header: h,
      key: h,
      width: Math.min(
        Math.max(
          h.length,
          ...dados.map(row => String(row[h] || '').length)
        ) + 2,
        45
      )
    }))

    // estilo do cabeçalho (linha 1)
    const headerRow = worksheet.getRow(1)
    headerRow.height = 22
    headerRow.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF274472' } // azul petróleo
      }
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 12
      }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
      }
    })

    // ------ DADOS ------
    dados.forEach(row => {
      const linha = headers.map(h => {
        let valor = row[h] || ''
        if (h === 'Data Limite') {
          valor = formatarDataSomenteDia(valor)
        }
        const hLower = h.toLowerCase()
        if (hLower.includes('cpf') || hLower.includes('cnpj')) {
          valor = limparCpfCnpj(valor)
        }
        return valor
      })
      worksheet.addRow(linha)
    })

    // ------ ESTILO DAS LINHAS (zebra + cores de data) ------
    const hojeBR = hoje.toLocaleDateString('pt-BR')

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i)
      const idxDados = i - 2 // índice em "dados"
      const registro = dados[idxDados]

      const dataBr = formatarDataSomenteDia(registro['Data Limite'])
      const d = parseDataBR(dataBr)

      const cinzaZebra = 'FFF9F9F9'
      const branco = 'FFFFFFFF'
      const amareloHoje = 'FFFFF8E1'
      const vermelhoAtraso = 'FFFAD4D4'

      let corFundo = (i % 2 === 0) ? cinzaZebra : branco

      if (d) {
        if (d < hoje) corFundo = vermelhoAtraso
        else if (dataBr === hojeBR) corFundo = amareloHoje
      }

      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: corFundo }
        }
        cell.font = {
          color: { argb: 'FF000000' },
          size: 10
        }
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        }
      })
    }

    // congela a primeira linha
    worksheet.views = [{ state: 'frozen', ySplit: 1 }]

    // ------ GERAR ARQUIVO E BAIXAR ------
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const nomeArquivo = `pendencias_mob_${new Date().toISOString().slice(0, 10)}.xlsx`
    saveAs(blob, nomeArquivo)
  }

  // --------- JSX ---------

  return (
    <div className={`App ${hasData ? 'tabela-visivel' : ''}`}>
      {!hasData ? (
        <>
          <header>
            <h1>Sistema Mob – Painel de Chamados</h1>
            <p>Envie o relatório e visualize as pendências de forma inteligente.</p>
          </header>
          <div className="upload-container">
            <Upload onUpload={handleUploadSuccess} />
          </div>
        </>
      ) : (
        <>
          <header>
            <h1>Sistema Mob – Painel de Chamados</h1>
            <p>
              Tabela filtrável por coluna. Exportação mostra apenas OS com Data Limite
              de hoje ou atrasadas, e só com status relevantes.
            </p>
          </header>

          <div className="actions">
            <button className="download" onClick={exportarFiltrado}>
              📥 Exportar Pendências
            </button>
            <button onClick={() => { setData(null); setFilteredData(null) }}>
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
            filtros={filtros}
            setFiltros={setFiltros}
            allData={data}
          />
        </>
      )}
    </div>
  )
}

export default App
