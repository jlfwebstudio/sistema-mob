import { useState } from 'react'
import * as XLSX from 'xlsx'

function Upload({ onUpload }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState(null)

  const handleFileChange = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (typeof onUpload !== 'function') {
      console.error('onUpload não é uma função. Verifique o App.jsx.')
      setError('Erro interno: callback de upload não encontrado.')
      return
    }

    setLoading(true)
    setError(null)
    setFileName(file.name)

    try {
      // Ler o arquivo direto no navegador
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })

      // Pega a primeira aba
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]

      // Converte para JSON (array de objetos)
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

      console.log('Linhas lidas do arquivo:', rows.length)

      if (!Array.isArray(rows) || rows.length === 0) {
        setError('Arquivo vazio ou formato inválido.')
        setLoading(false)
        return
      }

      // Chama o callback do App.jsx com os dados
      onUpload(rows)
    } catch (err) {
      console.error(err)
      setError('Falha ao processar o arquivo. Verifique se é um Excel/CSV válido.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload-box">
      <h2>Envie o relatório Mob</h2>
      <p>Selecione o arquivo Excel/CSV exportado do sistema para gerar o painel.</p>

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
