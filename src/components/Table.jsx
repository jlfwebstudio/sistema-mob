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

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const hoje_BR = hoje.toLocaleDateString('pt-BR')

  // Gera opções de filtro para cada coluna
  const filterOptions = useMemo(() => {
    const options = {}

    Object.keys(filtros).forEach(col => {
      const valores = new Set()
      allData?.forEach(row => {
        const val = row[col]
        if (val && String(val).trim()) {
          valores.add(String(val))
        } else {
          valores.add('(Vazio)')
        }
      })
      options[col] = Array.from(valores).sort()
    })

    return options
  }, [allData, filtros])

  const toggleFilter = (col, value) => {
    setFiltros(prev => ({
      ...prev,
      [col]: prev[col].includes(value)
        ? prev[col].filter(v => v !== value)
        : [...prev[col], value]
    }))
  }

  const toggleAllFilters = (col, selectAll) => {
    setFiltros(prev => ({
      ...prev,
      [col]: selectAll ? filterOptions[col] : []
    }))
  }

  // Função para determinar cor da linha
  const getRowColor = (row) => {
    const dataBr = row['Data Limite']
    const d = parseDataBR(dataBr)

    if (!d) return 'transparent'
    if (d < hoje) return '#FFD4D4'  // Vermelho (atrasado)
    if (dataBr === hoje_BR) return '#FFF8E1'  // Amarelo (hoje)
    return 'transparent'
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {Object.keys(filtros).map(col => (
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
                            checked={filtros[col].includes(value)}
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
              {Object.keys(filtros).map(col => (
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
