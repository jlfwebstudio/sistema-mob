import { useState } from 'react'
import * as XLSX from 'xlsx'

function Upload({ onUpload }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState(null)

  // As 13 colunas oficiais do relatório Mob
  const colunasPermitidas = [
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

  // Converte datas Excel (ex: 46266) para dd/mm/aaaa
  function normalizarData(valor) {
    if (valor === null || valor === undefined || valor === '') return ''

    // Se vier como número (serial Excel)
    if (typeof valor === 'number') {
      const parsed = XLSX.SSF.parse_date_code(valor)
      if (!parsed) return ''
      const dia = String(parsed.d).padStart(2, '0')
      const mes = String(parsed.m).padStart(2, '0')
      const ano = parsed.y
      return `${dia}/${mes}/${ano}`
    }

    let v = String(valor).trim()

    // Tira hora caso venha "2025-01-30 00:00:00"
    if (v.includes(' ')) v = v.split(' ')[0]

    // Formato ISO 2025-01-30
    if (v.includes('-')) {
      const [ano, mes, dia] = v.split('-')
      return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`
    }

    return v
  }

  // Limpeza de CPF/CNPJ (remove =, aspas, etc.)
  function limparCpfCnpj(valor) {
    if (!valor) return ''
    return String(valor).replace(/["'=]/g, '').trim()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (typeof onUpload !== 'function') {
      setError('Erro interno: callback de upload não encontrado.')
      return
    }

    setLoading(true)
    setError(null)
    setFileName(file.name)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array', cellDates: true })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]

      const bruto = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

      const filtrado = bruto.map(row => {
        const novo = {}

        colunasPermitidas.forEach(col => {
          let v = row[col] ?? ''

          if (col === 'Data Limite') {
            v = normalizarData(v)
          }

          if (col === 'CNPJ / CPF') {
            v = limparCpfCnpj(v)
          }

          novo[col] = v
        })

        return novo
      })

      onUpload(filtrado)
    } catch (err) {
      console.error(err)
      setError('Falha ao processar o arquivo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload-box">
      <h2>Envie o relatório Mob</h2>
      <p>Selecione o arquivo Excel/CSV para gerar o painel.</p>

      <label className="file-input-label">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          disabled={loading}
          style={{ display: 'none' }}
        />
        <span className="file-input-button">
          {loading ? '⏳ Processando...' : '📂 Escolher arquivo'}
        </span>
      </label>

      {fileName && <p className="file-name">✓ {fileName}</p>}
      {error && <p className="error-message">{error}</p>}
    </div>
  )
}

export default Upload
