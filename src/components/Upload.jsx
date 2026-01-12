import { useState } from 'react'
import * as XLSX from 'xlsx'

function Upload({ onUpload }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState(null)

  // Mapeamento: nome que queremos → possíveis variações no Excel
  const mapeamentoColunas = {
    'Origem': ['origem', 'origem chamado', 'origem_chamado', 'origemchamado'],
    'Chamado': ['chamado', 'numero chamado', 'nº chamado', 'num chamado'],
    'Numero Referencia': ['numero referencia', 'número referência', 'num referencia', 'numero_referencia', 'referencia'],
    'Contratante': ['contratante'],
    'Serviço': ['servico', 'serviço', 'tipo servico', 'tipo serviço'],
    'Status': ['status'],
    'Data Limite': ['data limite', 'data_limite', 'datalimite', 'dt limite', 'dt_limite'],
    'Cliente': ['cliente', 'cliente/unidade', 'cliente unidade', 'unidade'],
    'CNPJ / CPF': ['cnpj / cpf', 'cnpj/cpf', 'cpf/cnpj', 'cnpj', 'cpf', 'cpf_cnpj', 'cnpj_cpf'],
    'Cidade': ['cidade'],
    'Técnico': ['tecnico', 'técnico'],
    'Prestador': ['prestador'],
    'Justificativa do Abono': ['justificativa do abono', 'justificativa', 'justif abono', 'justif. abono', 'abono']
  }

  // Normaliza nome de coluna (remove acentos, espaços, lowercase)
  function normalizar(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  // Encontra a chave real no objeto row que corresponde ao nome desejado
  function encontrarColuna(row, nomeDesejado) {
    const variacoes = mapeamentoColunas[nomeDesejado] || []
    const todasVariacoes = [nomeDesejado, ...variacoes]

    for (const key of Object.keys(row)) {
      const keyNorm = normalizar(key)
      if (todasVariacoes.some(v => normalizar(v) === keyNorm)) {
        return key
      }
    }
    return null
  }

  // Converte datas (número Excel, Date object, string ISO, "Tue/Mon/Sun")
  function normalizarData(valor) {
    if (valor === null || valor === undefined || valor === '') return ''

    // Se for Date object
    if (valor instanceof Date) {
      const dia = String(valor.getDate()).padStart(2, '0')
      const mes = String(valor.getMonth() + 1).padStart(2, '0')
      const ano = valor.getFullYear()
      return `${dia}/${mes}/${ano}`
    }

    // Se for número (serial Excel)
    if (typeof valor === 'number') {
      const parsed = XLSX.SSF.parse_date_code(valor)
      if (parsed) {
        const dia = String(parsed.d).padStart(2, '0')
        const mes = String(parsed.m).padStart(2, '0')
        const ano = parsed.y
        return `${dia}/${mes}/${ano}`
      }
    }

    let v = String(valor).trim()

    // Se vier "Tue", "Mon", "Sun" etc. → ignora (dado inválido)
    if (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(v.toLowerCase())) {
      return ''
    }

    // Remove hora se vier "2025-01-30 00:00:00"
    if (v.includes(' ')) v = v.split(' ')[0]

    // Formato ISO: 2025-01-30
    if (v.includes('-')) {
      const partes = v.split('-')
      if (partes.length === 3) {
        const [ano, mes, dia] = partes
        return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`
      }
    }

    // Se já vier dd/mm/aaaa
    if (v.includes('/')) return v

    return ''
  }

  // Limpa CPF/CNPJ
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

      if (!Array.isArray(bruto) || bruto.length === 0) {
        setError('Arquivo vazio ou inválido.')
        setLoading(false)
        return
      }

      // Mapeia cada linha para as 13 colunas desejadas
      const colunasDesejadas = [
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

      const filtrado = bruto.map(row => {
        const novo = {}

        colunasDesejadas.forEach(nomeDesejado => {
          const chaveReal = encontrarColuna(row, nomeDesejado)
          let valor = chaveReal ? row[chaveReal] : ''

          if (nomeDesejado === 'Data Limite') {
            valor = normalizarData(valor)
          }

          if (nomeDesejado === 'CNPJ / CPF') {
            valor = limparCpfCnpj(valor)
          }

          novo[nomeDesejado] = valor
        })

        return novo
      })

      console.log('Linhas processadas:', filtrado.length)
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
