import { useState } from 'react'
import Upload from './components/Upload'
import Table from './components/Table'
import './App.css'
import * as XLSX from 'xlsx'

function App() {
  const [dados, setDados] = useState([])
  const [filtros, setFiltros] = useState({})
  const [tabelaVisivel, setTabelaVisivel] = useState(false)

  const receberUpload = (lista) => {
    if (!Array.isArray(lista) || lista.length === 0) {
      setDados([])
      setTabelaVisivel(false)
      return
    }

    setDados(lista)
    setTabelaVisivel(true)

    const inicial = {}
    Object.keys(lista[0]).forEach(c => {
      inicial[c] = []
    })
    setFiltros(inicial)
  }

  const temFiltros = Object.values(filtros).some(f => f.length > 0)

  const filtrar = (row) => {
    for (const col of Object.keys(filtros)) {
      const filtro = filtros[col]
      if (!filtro || filtro.length === 0) continue
      const valor = row[col] ? String(row[col]) : '(Vazio)'
      if (!filtro.includes(valor)) return false
    }
    return true
  }

  const dadosFiltrados = dados.filter(filtrar)

  const exportarPendencias = () => {
    if (!dadosFiltrados.length) {
      alert('Nenhum dado filtrado para exportar.')
      return
    }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const vencidos = dadosFiltrados.filter(row => {
      const str = row['Data Limite']
      if (!str) return false
      const [d, m, a] = str.split('/')
      const dt = new Date(a, m - 1, d)
      if (isNaN(dt)) return false
      dt.setHours(0, 0, 0, 0)
      return dt <= hoje
    })

    if (!vencidos.length) {
      alert('Nenhuma pendência vencida até hoje.')
      return
    }

    const wb = XLSX.utils.book_new()
    const cab = Object.keys(vencidos[0])
    const ws = XLSX.utils.aoa_to_sheet([cab])

    vencidos.forEach(r => {
      XLSX.utils.sheet_add_aoa(ws, [cab.map(c => r[c])], { origin: -1 })
    })

    XLSX.utils.book_append_sheet(wb, ws, 'Pendências')
    XLSX.writeFile(wb, 'pendencias_mob.xlsx')
  }

  const limparFiltros = () => {
    const inicial = {}
    Object.keys(filtros).forEach(c => { inicial[c] = [] })
    setFiltros(inicial)
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
