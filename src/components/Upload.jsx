import { useState } from 'react'
import * as XLSX from 'xlsx'

function Upload({ onUpload }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState(null)

  function limparCpfCnpj(valor) {
    if (!valor) return ''
    return String(valor).replace(/["'=]/g, '').trim()
  }

  function normalizarData(valor) {
    if (!valor) return ''

    if (valor instanceof Date && !isNaN(valor)) {
      const d = String(valor.getDate()).padStart(2, '0')
      const m = String(valor.getMonth() + 1).padStart(2, '0')
      const a = valor.getFullYear()
      return `${d}/${m}/${a}`
    }

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

    let s = String(valor).trim()

    if (s.includes(' ')) s = s.split(' ')[0]

    const iso = s.split('-')
    if (iso.length === 3 && iso[0].length === 4) {
      return `${iso[2].padStart(2, '0')}/${iso[1].padStart(2, '0')}/${iso[0]}`
    }

    if (s.includes('/')) {
      const p = s.split('/')
      if (p.length === 3) {
        const d = p[0].padStart(2, '0')
        const m = p[1].padStart(2, '0')
        const a = p[2]
        return `${d}/${m}/${a}`
      }
    }

    return ''
  }

  const statusPermitidos = status => {
    if (!status) return false
    const s = String(status).toLowerCase()

    return (
      s.includes('encaminh') ||
      s.includes('campo') ||
      s.includes('transfer') ||
      s.includes('proced') ||
      s.includes('reenc')
    )
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (typeof onUpload !== 'function') {
      setError('Erro interno: callback não encontrado.')
      return
    }

    setLoading(true)
    setError(null)
    setFileName(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const linhas = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      const processados = linhas
        .map(row => ({
          'Origem': 'MOB',
          'Chamado': row['Chamado'] || '',
          'Numero Referencia': row['Numero Referencia'] || '',
          'Contratante': row['Contratante'] || '',
          'Serviço': row['Serviço'] || '',
          'Status': row['Status'] || '',
          'Data Limite': normalizarData(row['Data Limite']),
          'Cliente': row['Nome Cliente'] || '',
          'CNPJ / CPF': limparCpfCnpj(row['CNPJ / CPF']),
          'Cidade': row['Cidade'] || '',
          'Técnico': row['Técnico'] || '',
          'Prestador': row['Prestador'] || ''
        }))
        .filter(x => statusPermitidos(x.Status))

      processados.sort((a, b) => {
        const [d1, m1, a1] = a['Data Limite'].split('/')
        const [d2, m2, a2] = b['Data Limite'].split('/')
        const v1 = `${a1}${m1}${d1}`
        const v2 = `${a2}${m2}${d2}`
        return v1.localeCompare(v2)
      })

      onUpload(processados)
    } catch (err) {
      setError('Erro ao processar arquivo.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload-box">
      <h2>📊 Importar Relatório Mob</h2>
      <p>Selecione o arquivo (XLSX, XLS ou CSV)</p>

      <label className="file-input-label">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          disabled={loading}
          style={{ display: 'none' }}
        />
        <span className="file-input-button">
          {loading ? '⏳ Processando...' : '📂 Escolher Arquivo'}
        </span>
      </label>

      {fileName && <p className="file-name">✓ {fileName}</p>}
      {error && <p className="error-message">{error}</p>}
    </div>
  )
}

export default Upload
