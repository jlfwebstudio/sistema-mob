import { useMemo, useState } from 'react'

function Table({ data, allData, filtros, setFiltros }) {
  const [open, setOpen] = useState({})

  if (!data || data.length === 0) return null

  const colunas = Object.keys(data[0])

  const opcoes = useMemo(() => {
    const m = {}
    colunas.forEach(c => {
      const valores = new Set()
      allData.forEach(r => valores.add(String(r[c] || '(Vazio)')))
      m[c] = Array.from(valores).sort()
    })
    return m
  }, [allData])

  const toggle = (col) => {
    setOpen(p => ({ ...p, [col]: !p[col] }))
  }

  const toggleValor = (col, valor) => {
    const atual = filtros[col] || []
    const novo = atual.includes(valor)
      ? atual.filter(v => v !== valor)
      : [...atual, valor]
    setFiltros({ ...filtros, [col]: novo })
  }

  const selecionarTodos = (col) =>
    setFiltros({ ...filtros, [col]: opcoes[col] })

  const limparColuna = (col) =>
    setFiltros({ ...filtros, [col]: [] })

  function cor(row) {
    if (!row['Data Limite']) return ''
    const [d, m, a] = row['Data Limite'].split('/')
    const dt = new Date(a, m - 1, d)
    const hoje = new Date()
    hoje.setHours(0,0,0,0)
    dt.setHours(0,0,0,0)
    if (dt < hoje) return 'row-atrasado'
    if (dt.getTime() === hoje.getTime()) return 'row-hoje'
    return ''
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {colunas.map(col => (
              <th key={col}>
                <div className="header-cell">
                  {col}
                  <button className="filter-btn" onClick={() => toggle(col)}>▼</button>
                </div>

                {open[col] && (
                  <div className="filter-dropdown">
                    <div className="filter-controls">
                      <button className="filter-btn-small" onClick={() => selecionarTodos(col)}>✓</button>
                      <button className="filter-btn-small" onClick={() => limparColuna(col)}>✗</button>
                    </div>

                    <div className="filter-options">
                      {opcoes[col].map(o => (
                        <label key={o} className="filter-option-label">
                          <input
                            type="checkbox"
                            checked={(filtros[col] || []).includes(o)}
                            onChange={() => toggleValor(col, o)}
                          />
                          {o}
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
          {data.map((r, i) (
            <tr key={i} className={cor(r)}>
              {colunas.map(c => (
                <td key={c}>{r[c] || '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Table
