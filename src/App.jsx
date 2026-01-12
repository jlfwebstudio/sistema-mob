import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import Upload from './components/Upload'
import Table from './components/Table'
import './App.css'

function App() {
  const [dados, setDados] = useState([])
  const [filtros, setFiltros] = useState({})
  const [tabelaVisivel, setTabelaVisivel] = useState(false)

  const receberUpload = (lista) => {
    setDados(lista)
    setTabelaVisivel(true)

    // Inicializa filtros com TODOS os valores selecionados
    const init = {}
    if (lista.length > 0) {
      Object.keys(lista[0]).forEach(col => {
        const valores = Array.from(new Set(lista.map(r => r[col] || '(Vazio)')))
        init[col] = valores
      })
    }
    setFiltros(init)
  }

  const dadosFiltrados = useMemo(() => {
    if (!dados.length) return []
    return dados.filter(row =>
      Object.keys(filtros).every(col => {
        const selecionados = filtros[col]
        if (!selecionados || selecionados.length === 0) return true
        const valor = row[col] || '(Vazio)'
        return selecionados.includes(valor)
      })
    )
  }, [dados, filtros])

  const temFiltros = useMemo(() => {
    if (!dados.length) return false
    return Object.keys(filtros).some(col => {
      const todos = Array.from(new Set(dados.map(r => r[col] || '(Vazio)')))
      return filtros[col]?.length !== todos.length
    })
  }, [dados, filtros])

  const limparFiltros = () => {
    if (!dados.length) return
    const init = {}
    Object.keys(dados[0]).forEach(col => {
      const valores = Array.from(new Set(dados.map(r => r[col] || '(Vazio)')))
      init[col] = valores
    })
    setFiltros(init)
  }

  const exportarPendencias = () => {
    if (!dados.length) return

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const pendentes = dados.filter(row => {
      const str = row['Data Limite']
      if (!str) return false
      const [d, m, a] = str.split('/')
      const dt = new Date(a, m - 1, d)
      if (isNaN(dt)) return false
      dt.setHours(0, 0, 0, 0)
      return dt <= hoje
    })

    if (!pendentes.length) {
      alert('Nenhuma pendência vencida ou para hoje.')
      return
    }

    const colunas = Object.keys(pendentes[0])

    const header = colunas.map(c => c.toUpperCase())
    const ws = XLSX.utils.aoa_to_sheet([header])

    pendentes.forEach(row => {
      const linha = colunas.map(c => row[c] || '')
      XLSX.utils.sheet_add_aoa(ws, [linha], { origin: -1 })
    })

    ws['!cols'] = colunas.map(() => ({ wch: 18 }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pendências')
    XLSX.writeFile(wb, 'pendencias_mob.xlsx')
  }

  return (
    <div className={`App ${tabelaVisivel ? 'tabela-visivel' : ''}`}>
      {!tabelaVisivel && (
        <>
          <header>
            <h1>Sistema Mob – Painel de Chamados</h1>
            <p>Faça upload do relatório para começar</p>
          </header>
          <div className="upload-container">
            <Upload onUpload={receberUpload} />
          </div>
        </>
      )}

      {tabelaVisivel && (
        <>
          <header>
            <h1>Sistema Mob – Painel de Chamados</h1>
          </header>

          <div className="actions">
            <button className="download" onClick={exportarPendencias}>
              📥 Exportar Pendências
            </button>
            <button onClick={() => window.location.reload()}>
              🔄 Novo Upload
            </button>
            {temFiltros && (
              <button className="limpar-filtros" onClick={limparFiltros}>
                ✖ Limpar Filtros
              </button>
            )}
          </div>

          <div className="info-registros">
            Mostrando <strong>{dadosFiltrados.length}</strong> registros
          </div>

          <Table
            data={dadosFiltrados}
            allData={dados}
            filtros={filtros}
            setFiltros={setFiltros}
          />
        </>
      )}
    </div>
  )
}

export default App
