import { useMemo, useState } from 'react'

function parseDataBR(str) {
  if (!str) return null
  const partes = str.split('/')
  if (partes.length !== 3) return null
  const [d, m, a] = partes
  const dt = new Date(a, m - 1, d)
  return isNaN(dt) ? null : dt
}

function Table({ data, allData, filtros, setFiltros }) {
  const [expandedFilters, setExpandedFilters] = useState({})

  if (!data || data.length === 0) return null

  const colunas = Object.keys(data[0])

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const hojeBR = hoje.toLocaleDateString('pt-BR')

  const filterOptions = useMemo(() => {
    const options = {}
    colunas.forEach(col => {
      const valores = new Set()
      let temVazio = false

      allData.forEach(row => {
        const v = row[col]
        if (!v || String(v).trim() === '') {
          temVazio = true
        } else {
          valores.add(String(v))
        }
      })

      const lista = Array.from(valores).sort()
      if (temVazio) lista.unshift('(Vazio)')
      options[col] = lista
    })
    return options
  }, [allData, colunas])

  const toggleFilter = (coluna, valor) => {
    const atual = filtros[coluna] || []
    const novo = atual.includes(valor)
      ? atual.filter(v => v !== valor)
      : [...atual, valor]
    setFiltros({ ...filtros, [coluna]: novo })
  }

  const toggleAllFilters = (coluna, selecionar) => {
    if (selecionar) {
      setFiltros({ ...filtros, [coluna]: filterOptions[coluna] })
    } else {
      setFiltros({ ...filtros, [coluna]: [] })
    }
  }

  function getRowColor(row) {
    const dataBr = row['Data Limite']
    const d = parseDataBR(dataBr)

    if (!d) return 'transparent'
    if (d < hoje) return '#FFD4D4'
    if (dataBr === hojeBR) return '#FFF8E1'
    return 'transparent'
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {colunas.map(col => (
              <th key={col}>
                <div className="header-cell">
                  <span>{col}</span>
                  <button
                    className="filter-btn"
                    onClick={() => setExpandedFilters(prev => ({
                      ...prev,
                      [col]: !prev[col]
                    }))}
                    title="Filtrar"
                  >
                    ⚙️
                  </button>
                </div>

                {expandedFilters[col] && (
                  <div className="filter-dropdown">
                    <div className="filter-controls">
                      <button
                        onClick={() => toggleAllFilters(col, true)}
                        className="filter-btn-small"
                      >
                        ✓ Todos
                      </button>
                      <button
                        onClick={() => toggleAllFilters(col, false)}
                        className="filter-btn-small"
                      >
                        ✗ Nenhum
                      </button>
                    </div>
                    <div className="filter-options">
                      {filterOptions[col]?.map(value => (
                        <label key={value}>
                          <input
                            type="checkbox"
                            checked={(filtros[col] || []).includes(value)}
                            onChange={() => toggleFilter(col, value)}
                          />
                          {value}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data?.map((row, idx) => (
            <tr key={idx} style={{ backgroundColor: getRowColor(row) }}>
              {colunas.map(col => (
                <td key={`${idx}-${col}`}>
                  {row[col] || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Table
