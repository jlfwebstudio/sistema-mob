import { useMemo, useState } from 'react'

function Table({ data, filtros, setFiltros, allData }) {
  const [dropdownAberto, setDropdownAberto] = useState(null)

  if (!data || data.length === 0) {
    return <p style={{ color: '#ccc' }}>Nenhum dado disponível</p>
  }

  function formatarDataLimite(valor) {
    if (!valor) return ''
    const v = String(valor).trim()

    if (v.length === 10 && v[2] === '/' && v[5] === '/') return v
    if (v.includes(' ')) return v.split(' ')[0]
    if (v.includes('-')) {
      const partes = v.split('T')[0].split('-')
      if (partes.length === 3) {
        const [ano, mes, dia] = partes
        return `${dia}/${mes}/${ano}`
      }
    }
    return v
  }

  function abreviarServico(servico) {
    if (!servico) return '—'
    const s = String(servico).toLowerCase()
    if (s.includes('instal')) return 'INST'
    if (s.includes('desinst')) return 'DES'
    if (s.includes('manut')) return 'MAN'
    if (s.includes('visita')) return 'VIS'
    if (s.includes('retirada')) return 'RET'
    if (s.includes('limpeza')) return 'LIMP'
    return String(servico).slice(0, 4).toUpperCase()
  }

  function abreviarContratante(contratante) {
    if (!contratante) return '—'
    const c = String(contratante).toUpperCase()
    if (c.includes('MOBYAN')) return 'MOB'
    if (c.includes('GETNET')) return 'GET'
    if (c.includes('PUNTO')) return 'PUN'
    return c.length > 4 ? c.slice(0, 4) : c
  }

  function limparCNPJ(cnpj) {
    if (!cnpj) return '—'
    return String(cnpj)
      .replace(/=/g, '')
      .replace(/"/g, '')
      .replace(/'/g, '')
      .trim()
  }

  const colunas = Object.keys(data[0]).filter(col => col !== 'Prioridade')

  const colunasFiltraveis = [
    'Status',
    'Serviço',
    'Data Limite',
    'Cliente',
    'Técnico',
    'Prestador',
    'Justificativa do Abono'
  ]

  const opcoesUnicas = useMemo(() => {
    const opcoes = {}
    colunasFiltraveis.forEach(coluna => {
      const valores = allData.map(row => {
        let valor = row[coluna]
        if (coluna === 'Data Limite') valor = formatarDataLimite(valor)
        return valor
      })
      const preenchidos = [...new Set(
        valores.filter(v => v && String(v).trim() !== '' && v !== '—')
      )].sort()
      const temVazios = valores.some(v => !v || String(v).trim() === '' || v === '—')
      opcoes[coluna] = temVazios ? ['(Vazio)', ...preenchidos] : preenchidos
    })
    return opcoes
  }, [allData])

  const toggleFiltro = (coluna, valor) => {
    setFiltros(prev => {
      const atual = prev[coluna] || []
      const novo = atual.includes(valor)
        ? atual.filter(v => v !== valor)
        : [...atual, valor]
      return { ...prev, [coluna]: novo }
    })
  }

  const selecionarTodos = (coluna) => {
    setFiltros(prev => ({
      ...prev,
      [coluna]: opcoesUnicas[coluna] || []
    }))
  }

  const desmarcarTodos = (coluna) => {
    setFiltros(prev => ({
      ...prev,
      [coluna]: []
    }))
  }

  const toggleDropdown = (coluna, e) => {
    e.stopPropagation()
    setDropdownAberto(dropdownAberto === coluna ? null : coluna)
  }

  const handleClickOutside = () => {
    setDropdownAberto(null)
  }

  return (
    <div className="table-container" onClick={handleClickOutside}>
      <table>
        <thead>
          <tr>
            {colunas.map((coluna) => {
              const temFiltro = colunasFiltraveis.includes(coluna)
              const filtroAtivo = filtros[coluna]?.length > 0
              const aberto = dropdownAberto === coluna

              return (
                <th key={coluna} className={filtroAtivo ? 'filtro-ativo' : ''}>
                  <div className="th-content">
                    <span>{coluna}</span>
                    {temFiltro && (
                      <div className="filter-dropdown-wrapper">
                        <button
                          className="filter-btn"
                          title="Filtrar"
                          onClick={(e) => toggleDropdown(coluna, e)}
                        >
                          ▼
                        </button>
                        {aberto && (
                          <div
                            className="filter-dropdown aberto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="filter-actions">
                              <button
                                className="btn-selecionar-todos"
                                onClick={() => selecionarTodos(coluna)}
                              >
                                ✓ Selecionar Tudo
                              </button>
                              <button
                                className="btn-desmarcar-todos"
                                onClick={() => desmarcarTodos(coluna)}
                              >
                                ✖ Desmarcar Tudo
                              </button>
                            </div>
                            <div className="filter-options">
                              {opcoesUnicas[coluna]?.map((opcao) => (
                                <label key={opcao} className="filter-option">
                                  <input
                                    type="checkbox"
                                    checked={filtros[coluna]?.includes(opcao) || false}
                                    onChange={() => toggleFiltro(coluna, opcao)}
                                  />
                                  <span>{opcao}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const prioridadeClass = row.Prioridade
              ? `prioridade-${row.Prioridade}`
              : ''

            return (
              <tr key={index} className={prioridadeClass}>
                {colunas.map((coluna) => {
                  let valor = row[coluna] ?? '—'

                  if (coluna === 'Data Limite') {
                    valor = formatarDataLimite(valor)
                  } else if (coluna === 'Serviço' || coluna === 'Servico') {
                    valor = abreviarServico(valor)
                  } else if (coluna === 'Contratante') {
                    valor = abreviarContratante(valor)
                  } else if (
                    coluna === 'CNPJ' ||
                    coluna === 'CPF' ||
                    coluna.toLowerCase().includes('cnpj')
                  ) {
                    valor = limparCNPJ(valor)
                  }

                  return <td key={coluna}>{valor}</td>
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default Table
