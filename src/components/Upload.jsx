import { useState } from 'react'

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
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('http://127.0.0.1:8000/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`)
      }

      const json = await response.json()
      console.log('Resposta bruta da API /upload:', json)

      // Ajuste conforme o backend:
      // se ele devolve { rows: [...] }, pegamos json.rows
      // se devolve { data: [...] }, pegamos json.data
      // se já devolve um array, usamos direto
      const rows = Array.isArray(json) ? json : (json.rows || json.data)

      if (!Array.isArray(rows)) {
        console.error('Resposta da API não é um array:', json)
        setError('Resposta inesperada do servidor.')
        setLoading(false)
        return
      }

      console.log('Linhas recebidas do backend:', rows.length)
      onUpload(rows)
    } catch (err) {
      console.error(err)
      setError('Falha ao enviar arquivo. Verifique se o servidor backend está rodando.')
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
