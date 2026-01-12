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
    if (valor === null || valor === undefined || valor === '') return ''

    // Date nativo
    if (valor instanceof Date && !isNaN(valor)) {
      const d = String(valor.getDate()).padStart(2, '0')
      const m = String(valor.getMonth() + 1).padStart(2, '0')
      const a = valor.getFullYear()
      return `${d}/${m}/${a}`
    }

    // Número Excel (serial)
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

    // String
    let str = String(valor).trim()

    // Ignorar strings tipo "Mon", "Tue"
    const semana = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    if (semana.includes(str.toLowerCase())) return ''

    // Remove hora: "2026-01-12 00:00:00" → "2026-01-12"
    if (str.includes(' ')) {
      str = str.split(' ')[0]
    }

    // Formato ISO: 2026-01-12 (REGEX EM UMA LINHA SÓ)
    const iso = str.split('-')
    if (iso.length === 3 && iso[0].length === 4) {
      const [ano, mes, dia] = iso
      return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`
    }

    // Formatos com barra
    if (str.includes('/')) {
      const partes = str.split('/')
      if (partes.length === 3 && partes[2].length === 4) {
        const [p1, p2, ano] = partes
        const n1 = parseInt(p1, 10)
        const n2 = parseInt(p2, 10)

        // Se p1 > 12 → é dia (DD/MM/YYYY)
        if (n1 > 12) {
          return `${p1.padStart(2, '0')}/${p2.padStart(2, '0')}/${ano}`
        }

        // Se p2 > 12 → formato americano (MM/DD/YYYY)
        if (n2 > 12) {
          return `${p2.padStart(2, '0')}/${p1.padStart(2, '0')}/${ano}`
        }

        // Ambos <= 12 → assume BR
        return `${p1.padStart(2, '0')}/${p2.padStart(2, '0')}/${ano}`
      }
    }

    return ''
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
      const bruto = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      if (!Array.isArray(bruto) || bruto.length === 0) {
        setError('Arquivo vazio ou inválido.')
        setLoading(false)
        return
      }

      const processados = bruto.map(row => ({
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
        'Prestador': row['Prestador'] || '',
        'Justificativa do Abono': row['Justificativa do Abono'] || ''
      }))

      // Ordena por Data Limite (crescente)
      processados.sort((a, b) => {
        const [d1, m1, a1] = (a['Data Limite'] || '99/99/9999').split('/')
        const [d2, m2, a2] = (b['Data Limite'] || '99/99/9999').split('/')
        const v1 = `${a1}${m1}${d1}`
        const v2 = `${a2}${m2}${d2}`
        return v1.localeCompare(v2)
      })

      onUpload(processados)
    } catch (err) {
      console.error(err)
      setError('Falha ao processar o arquivo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload-box">
      <h2>📊 Enviar Relatório Mob</h2>
      <p>Selecione o arquivo Excel (.xlsx/.xls)</p>

      <label className="file-input-label">
        <input
          type="file"
          accept=".xlsx,.xls"
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
