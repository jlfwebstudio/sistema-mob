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

  // Normaliza data para DD/MM/AAAA, com detecção de formato MM/DD/AAAA
  function normalizarData(valor) {
    if (!valor) return ''

    // 1) Date nativo (já está correto)
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

    // Remove hora (ex: "12/01/2026 00:00:00")
    const espaco = str.indexOf(' ')
    if (espaco !== -1) {
      str = str.slice(0, espaco).trim()
    }

    // Formato ISO: AAAA-MM-DD
    const partesHifen = str.split('-')
    if (partesHifen.length === 3 && partesHifen[0].length === 4) {
      const [ano, mes, dia] = partesHifen
      return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`
    }

    // Formato com barra: DD/MM/AAAA ou MM/DD/AAAA
    const partesBarra = str.split('/')
    if (partesBarra.length === 3) {
      let p1 = parseInt(partesBarra[0], 10)
      let p2 = parseInt(partesBarra[1], 10)
      const p3 = partesBarra[2]

      // Ano deve ter 4 dígitos
      if (p3.length !== 4) return ''

      // LÓGICA DE DETECÇÃO DE FORMATO MM/DD/AAAA vs DD/MM/AAAA:
      // Se o primeiro número (p1) é maior que 12, ele só pode ser o dia (DD/MM/AAAA)
      if (p1 > 12) {
        return `${String(p1).padStart(2, '0')}/${String(p2).padStart(2, '0')}/${p3}`
      }

      // Se o segundo número (p2) é maior que 12, ele só pode ser o dia (MM/DD/AAAA), então inverte
      if (p2 > 12) {
        return `${String(p2).padStart(2, '0')}/${String(p1).padStart(2, '0')}/${p3}`
      }

      // Caso ambíguo (ambos p1 e p2 são <= 12):
      // Vamos tentar criar as duas datas e ver qual é válida e faz mais sentido.
      // Priorizamos o formato DD/MM/AAAA, mas corrigimos se for claramente MM/DD/AAAA.
      const dataBR = new Date(p3, p2 - 1, p1); // YYYY, MM-1, DD
      const dataUS = new Date(p3, p1 - 1, p2); // YYYY, MM-1, DD (invertido)

      const isValidBR = !isNaN(dataBR) && dataBR.getDate() === p1 && (dataBR.getMonth() + 1) === p2;
      const isValidUS = !isNaN(dataUS) && dataUS.getDate() === p2 && (dataUS.getMonth() + 1) === p1;

      // Se apenas o formato US é válido, ou se ambos são válidos mas o US parece mais provável
      // (ex: 01/09/2026 no BR seria 1 de setembro, mas 09/01/2026 no US seria 1 de setembro)
      // Se a data original é 09/01/2026 e o sistema está mostrando 01/09/2026,
      // isso indica que o 09 é o mês e o 01 é o dia.
      // Então, se a data original (p1/p2) é 09/01 e o sistema está invertendo,
      // significa que p1 (09) é o mês e p2 (01) é o dia.
      if (isValidUS && (!isValidBR || (p1 > p2 && p1 <= 12))) { // Ex: 09/01 -> 9 é mês, 1 é dia
        return `${String(p2).padStart(2, '0')}/${String(p1).padStart(2, '0')}/${p3}`
      }

      // Por padrão, assume DD/MM/AAAA
      return `${String(p1).padStart(2, '0')}/${String(p2).padStart(2, '0')}/${p3}`
    }

    // Se não corresponde a nenhum formato conhecido, retorna vazio
    return ''
  }

  // Status que queremos manter
  function statusPermitidos(status) {
    if (!status) return false
    const s = String(status).toLowerCase()
    return (
      s.includes('encaminh') ||      // encaminhado, encaminhada...
      s.includes('transfer') ||      // em transferência
      s.includes('campo') ||         // em campo
      s.includes('reenc') ||         // reencaminhado
      s.includes('proced')           // procedimento técnico
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
        const v1 = `${a1}${m1}${d1}` // Converte para AAAA-MM-DD para comparação
        const v2 = `${a2}${m2}${d2}`
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
