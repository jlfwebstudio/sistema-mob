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

  /**
   * normalizarData
   * Regras:
   * - Se já vier como string DD/MM/AAAA HH:mm ou DD/MM/AAAA → só remove a hora, NÃO inverte nada.
   * - Se vier como Date ou número Excel → converte para DD/MM/AAAA.
   * - Se vier como ISO AAAA-MM-DD → converte para DD/MM/AAAA.
   * - NÃO tenta adivinhar americano; prefere sempre DD/MM.
   */
  function normalizarData(valorBruto) {
    if (valorBruto === null || valorBruto === undefined || valorBruto === '') {
      return ''
    }

    // 1) Date nativo
    if (valorBruto instanceof Date && !isNaN(valorBruto)) {
      const d = String(valorBruto.getDate()).padStart(2, '0')
      const m = String(valorBruto.getMonth() + 1).padStart(2, '0')
      const a = valorBruto.getFullYear()
      return `${d}/${m}/${a}`
    }

    // 2) Número Excel (serial)
    if (typeof valorBruto === 'number') {
      const data = XLSX.SSF.parse_date_code(valorBruto)
      if (data) {
        const d = String(data.d).padStart(2, '0')
        const m = String(data.m).padStart(2, '0')
        const a = data.y
        return `${d}/${m}/${a}`
      }
      return ''
    }

    // 3) String
    let str = String(valorBruto).trim()
    if (!str) return ''

    // tira a hora, se tiver
    if (str.includes(' ')) {
      str = str.split(' ')[0].trim()
    }

    // 3.1) ISO: 2026-01-09 → 09/01/2026
    if (str.includes('-')) {
      const partes = str.split('-')
      if (partes.length === 3 && partes[0].length === 4) {
        const [ano, mes, dia] = partes
        return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`
      }
    }

    // 3.2) Já está em DD/MM/AAAA ou D/M/AAAA → NÃO MEXE NA ORDEM
    if (str.includes('/')) {
      const partes = str.split('/')
      if (partes.length === 3) {
        let [p1, p2, p3] = partes.map(p => p.trim())
        if (p3.length === 4) {
          const dia = p1.padStart(2, '0')
          const mes = p2.padStart(2, '0')
          const ano = p3
          return `${dia}/${mes}/${ano}`
        }
      }
    }

    // qualquer coisa diferente, ignora
    return ''
  }

  function statusPermitidos(status) {
    if (!status) return false
    const s = String(status).toLowerCase()
    return (
      s.includes('encaminh') ||
      s.includes('transfer') ||
      s.includes('campo') ||
      s.includes('reenc') ||
      s.includes('proced')
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

      // IMPORTANTE: cellDates = false pra NÃO deixar o XLSX converter tudo pra Date
      const workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: false,
        raw: false
      })

      const primeiraAba = workbook.SheetNames[0]
      const sheet = workbook.Sheets[primeiraAba]

      const bruto = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      if (!Array.isArray(bruto) || bruto.length === 0) {
        setError('Arquivo vazio ou em formato inesperado.')
        setLoading(false)
        return
      }

      const processados = bruto
        .map(row => {
          const valorOriginalData = row['Data Limite']

          return {
            Origem: 'MOB',
            Chamado: row['Chamado'] || '',
            'Numero Referencia': row['Numero Referencia'] || '',
            Contratante: row['Contratante'] || '',
            Serviço: row['Serviço'] || '',
            Status: row['Status'] || '',
            // aqui aplicamos a função nova
            'Data Limite': normalizarData(valorOriginalData),
            Cliente: row['Nome Cliente'] || '',
            'CNPJ / CPF': limparCpfCnpj(row['CNPJ / CPF']),
            Cidade: row['Cidade'] || '',
            Técnico: row['Técnico'] || '',
            Prestador: row['Prestador'] || ''
          }
        })
        .filter(r => statusPermitidos(r.Status))

      if (!processados.length) {
        setError('Nenhuma linha com status permitido encontrada.')
        setLoading(false)
        return
      }

      // Ordena por data (sem alterar o formato mostrado)
      processados.sort((a, b) => {
        const aStr = a['Data Limite'] || '99/99/9999'
        const bStr = b['Data Limite'] || '99/99/9999'
        const [d1, m1, y1] = aStr.split('/')
        const [d2, m2, y2] = bStr.split('/')
        const v1 = `${y1}${m1}${d1}`
        const v2 = `${y2}${m2}${d2}`
        return v1.localeCompare(v2)
      })

      onUpload(processados)
    } catch (err) {
      console.error(err)
      setError('Erro ao processar o arquivo. Verifique se está em .xlsx / .xls / .csv.')
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
