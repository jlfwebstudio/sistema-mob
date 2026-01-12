import { useState } from 'react'
import * as XLSX from 'xlsx'

function Upload({ onUpload }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState(null)

  // Remove caracteres indesejados de CPF/CNPJ
  function limparCpfCnpj(valor) {
    if (!valor) return ''
    return String(valor).replace(/["'=]/g, '').trim()
  }

  // Normaliza data para DD/MM/AAAA, sem usar regex
  function normalizarData(valor) {
    if (valor === null || valor === undefined || valor === '') return ''

    // 1) Date nativo
    if (valor instanceof Date && !isNaN(valor)) {
      const d = String(valor.getDate()).padStart(2, '0')
      const m = String(valor.getMonth() + 1).padStart(2, '0')
      const a = valor.getFullYear()
      return `${d}/${m}/${a}`
    }

    // 2) Número Excel (serial)
    if (typeof valor === 'number') {
      const data = XLSX.SSF.parse_date_code(valor)
      if (data) {
        const d = String(data.d).padStart(2, '0')
        const m = String(data.m).padStart(2, '0')
        const a = data.y
        return `${d}/${m}/${a}`
      }
      return ''
    }

    // 3) String
    let str = String(valor).trim()
    if (!str) return ''

    // Remove hora, se vier "12/01/2026 00:00:00"
    const espaco = str.indexOf(' ')
    if (espaco !== -1) {
      str = str.slice(0, espaco).trim()
    }

    // ISO: AAAA-MM-DD
    const temHifen = str.indexOf('-') !== -1
    if (temHifen) {
      const partes = str.split('-')
      if (partes.length === 3 && partes[0].length === 4) {
        const ano = partes[0]
        const mes = partes[1].padStart(2, '0')
        const dia = partes[2].padStart(2, '0')
        return `${dia}/${mes}/${ano}`
      }
    }

    // DD/MM/AAAA (padrão Mobyan) – sem regex
    const temBarra = str.indexOf('/') !== -1
    if (temBarra) {
      const partes = str.split('/')
      if (partes.length === 3) {
        const p1 = partes[0].padStart(2, '0')
        const p2 = partes[1].padStart(2, '0')
        const p3 = partes[2]
        // Só aceitamos se o "ano" tiver 4 dígitos
        if (p3.length === 4) {
          return `${p1}/${p2}/${p3}`
        }
      }
    }

    // Qualquer outra coisa: não arrisca
    return ''
  }

  // Status que queremos manter
  function statusPermitidos(status) {
    if (!status) return false
    const s = String(status).toLowerCase()
    return (
      s.indexOf('encaminh') !== -1 || // encaminhado/encaminhada
      s.indexOf('transfer') !== -1 || // em transferência
      s.indexOf('campo') !== -1 ||    // em campo
      s.indexOf('reenc') !== -1 ||    // reencaminhado
      s.indexOf('proced') !== -1      // procedimento técnico
    )
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setFileName(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
      const primeiraAba = workbook.SheetNames[0]
      const sheet = workbook.Sheets[primeiraAba]

      const bruto = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      if (!Array.isArray(bruto) || bruto.length === 0) {
        setError('Arquivo vazio ou em formato inesperado.')
        setLoading(false)
        return
      }

      const processados = bruto
        .map(row => ({
          Origem: 'MOB',
          Chamado: row['Chamado'] || '',
          'Numero Referencia': row['Numero Referencia'] || '',
          Contratante: row['Contratante'] || '',
          Serviço: row['Serviço'] || '',
          Status: row['Status'] || '',
          'Data Limite': normalizarData(row['Data Limite']),
          Cliente: row['Nome Cliente'] || '',
          'CNPJ / CPF': limparCpfCnpj(row['CNPJ / CPF']),
          Cidade: row['Cidade'] || '',
          Técnico: row['Técnico'] || '',
          Prestador: row['Prestador'] || ''
          // "Observações do Abono" foi intencionalmente descartada
        }))
        .filter(r => statusPermitidos(r.Status))

      if (!processados.length) {
        setError('Nenhuma linha com status permitido encontrada.')
        setLoading(false)
        return
      }

      // Ordena por Data Limite crescente
      processados.sort((a, b) => {
        const aStr = a['Data Limite'] || '99/99/9999'
        const bStr = b['Data Limite'] || '99/99/9999'
        const [d1, m1, a1] = aStr.split('/')
        const [d2, m2, a2] = bStr.split('/')
        const v1 = `${a1}${m1}${d1}`
        const v2 = `${a2}${m2}${d2}`
        return v1.localeCompare(v2)
      })

      onUpload(processados)
    } catch (err) {
      console.error(err)
      setError('Erro ao processar o arquivo. Verifique se é .xlsx, .xls ou .csv.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload-box">
      <h2>📊 Importar Relatório MOB</h2>
      <p>Selecione um arquivo .xlsx, .xls ou .csv</p>

      <input
        id="mob-upload"
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={loading}
      />

      <button
        className="file-input-button"
        type="button"
        onClick={() => document.getElementById('mob-upload').click()}
        disabled={loading}
      >
        {loading ? '⏳ Processando...' : '📂 Escolher Arquivo'}
      </button>

      {fileName && <p className="file-name">✓ {fileName}</p>}
      {error && <p className="error-message">{error}</p>}
    </div>
  )
}

export default Upload
