import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'

function Table({ data }) {
  const colunas = [
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

  const [filtros, setFiltros] = useState({})

  const opcoesUnicas = useMemo(() => {
    const opcoes = {}
    colunas.forEach(col => {
      opcoes[col] = [...new Set(data.map(row => row[col] || '—'))].sort()
    })
    return opcoes
  }, [data])

  const toggleFiltro = (coluna, valor) => {
    setFiltros(prev => {
      const atual = prev[coluna] || []
      const novo = atual.includes(valor)
        ? atual.filter(v => v !== valor)
        : [...atual, valor]
      return { ...prev, [coluna]: novo }
    })
  }

  const dadosFiltrados = useMemo(() => {
    return data.filter(row => {
      return colunas.every(col => {
        const filtroAtivo = filtros[col]
        if (!filtroAtivo || filtroAtivo.length === 0) return true
        const valorCelula = row[col] || '—'
        return filtroAtivo.includes(valorCelula)
      })
    })
  }, [data, filtros])

  const getCorLinha = (row) => {
    const dataLimite = row['Data Limite']
    if (!dataLimite || dataLimite === '—') return ''

    const [dia, mes, ano] = dataLimite.split('/').map(Number)
    if (!dia || !mes || !ano) return ''

    const limite = new Date(ano, mes - 1, dia)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    limite.setHours(0, 0, 0, 0)

    if (limite < hoje) return 'row-atrasado'
    if (limite.getTime() === hoje.getTime()) return 'row-hoje'
    return ''
  }

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(dadosFiltrados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Dados')
    XLSX.writeFile(wb, 'relatorio_mobyan.xlsx')
  }

  return (
    <div className="table-container">
      <div className="actions">
        <button onClick={exportarExcel}>📥 Exportar para Excel</button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            {colunas.map(col => (
              <th key={col}>
                <div className="th-content">
                  <span>{col}</span>
                  <div className="filter-dropdown">
                    <button className="filter-btn">▼</button>
                    <div className="filter-menu">
                      {opcoesUnicas[col]?.map(opcao => (
                        <label key={opcao} className="filter-option">
                          <input
                            type="checkbox"
                            checked={(filtros[col] || []).includes(opcao)}
                            onChange={() => toggleFiltro(col, opcao)}
                          />
                          <span>{opcao}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dadosFiltrados.map((row, idx) => (
            <tr
              key={idx}
              className={`${idx % 2 === 0 ? 'row-par' : 'row-impar'} ${getCorLinha(row)}`}
            >
              {colunas.map(col => (
                <td key={col}>{row[col] || '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Table
