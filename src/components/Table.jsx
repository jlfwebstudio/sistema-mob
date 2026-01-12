import { useMemo, useState, useRef, useEffect } from 'react'

function Table({ data, allData, filtros, setFiltros }) {
  const [open, setOpen] = useState({})
  const tableRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (!tableRef.current) return
      if (!tableRef.current.contains(e.target)) {
        setOpen({})
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!Array.isArray(data) || data.length === 0) return null

  const colunas = Object.keys(data[0])

  const opcoes = useMemo(() => {
    const m = {}
    colunas.forEach(c => {
      const valores = new Set()
      allData.forEach(r => valores.add(r[c] || '(Vazio)'))
      m[c] = Array.from(valores).sort()
    })
    return m
  }, [allData, colunas])

  const toggleDropdown = (col) => {
    setOpen(prev => {
      const novo = {}
      novo[col] = !prev[col]
      return novo
    })
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
    const str = row['Data Limite']
    if (!str) return ''
    const [d, m, a] = str.split('/')
    const dt = new Date(a, m - 1, d)
    if (isNaN(dt)) return ''
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    dt.setHours(0, 0, 0, 0)
    if (dt < hoje) return 'row-atrasado'
    if (dt.getTime() === hoje.getTime()) return 'row-hoje'
    return ''
  }

  return (
    <div className="table-container" ref={tableRef}>
      <table className="data-table">
        <thead>
          <tr>
            {colunas.map(col => (
              <th key={col}>
                <div className="header-cell">
                  <span>{col}</span>
                  <button
                    type="button"
                    className="filter-btn"
                    onClick={() => toggleDropdown(col)}
                  >
                    ▼
                  </button>
                </div>

                {open[col] && (
                  <div className="filter-dropdown">
                    <div className="filter-controls">
                      <button
                        type="button"
                        className="filter-btn-small"
                        onClick={() => selecionarTodos(col)}
                      >
                        ✓ Todos
                      </button>
                      <button
                        type="button"
                        className="filter-btn-small"
                        onClick={() => limparColuna(col)}
                      >
                        ✗ Nenhum
                      </button>
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
          {data.map((r, i) => (
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
