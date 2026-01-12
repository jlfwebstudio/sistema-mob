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

    let s = String(valor).trim()
    if (!s) return ''

    // Remove hora
    if (s.includes(' ')) s = s.split(' ')[0]

    // Formato ISO: 2026-01-12 → 12/01/2026
    const isoParts = s.split('-')
    if (isoParts.length === 3 && isoParts[0].length === 4) {
      const [a, m, d] = isoParts
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${a}`
    }

    // Formato com barra
    if (s.includes('/')) {
      const p = s.split('/')
      if (p.length === 3) {
        const [p1, p2, p3] = p

        // Se p3 tem 4 dígitos, é o ano
        if (p3.length === 4) {
          const n1 = parseInt(p1, 10)
          const n2 = parseInt(p2, 10)

          // REGRA CRÍTICA: se p1 > 12, é DIA (formato BR: DD/MM/YYYY)
          if (n1 > 12) {
            return `${p1.padStart(2, '0')}/${p2.padStart(2, '0')}/${p3}`
          }

          // Se p2 > 12, é formato americano (MM/DD/YYYY) → inverte
          if (n2 > 12) {
            return `${p2.padStart(2, '0')}/${p1.padStart(2, '0')}/${p3}`
          }

          // Se ambos <= 12, assume BR (DD/MM/YYYY)
          // EXCETO se p1 == 01 e p2 == 12 (provável americano 01/12 = 12 de janeiro)
          // Nesse caso, inverte
          if (n1 === 1 && n2 === 12) {
            return `${p2.padStart(2, '0')}/${p1.padStart(2, '0')}/${p3}`
          }

          // Caso contrário, assume BR
          return `${p1.padStart(2, '0')}/${p2.padStart(2, '0')}/${p3}`
        }
      }
    }

    return ''
  }

  const statusPermitidos = (status) => {
    if (!status) return false
    const s = String(status).toLowerCase()
    return (
      s.includes('encaminh') ||
      s.includes('transfer') ||
      s.includes('campo') ||
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
      const nomePrimeiraAba = workbook.SheetNames[0]
      const sheet = workbook.Sheets[nomePrimeiraAba]
      const bruto = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      if (!Array.isArray(bruto) || bruto.length === 0) {
        setError('Arquivo vazio ou formato inválido.')
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
          Prestador: row['Prestador'] || '',
          'Justificativa do Abono': row['Justificativa do Abono'] || ''
        }))
        .filter(r => statusPermitidos(r.Status))

      if (processados.length === 0) {
        setError('Nenhuma linha com status permitido encontrada.')
        setLoading(false)
        return
      }

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
      setError('Erro ao ler o arquivo. Verifique o formato.')
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
      </label>

      <button
        className="file-input-button"
        type="button"
        onClick={() => document.querySelector('.upload-box input[type="file"]').click()}
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
