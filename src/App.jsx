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
      if (filtro.length > 0 && !filtro.includes(String(row[col]))) return false
    }
    return true
  }

  const dadosFiltrados = dados.filter(filtrar)

  const exportarPendencias = () => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const vencidos = dadosFiltrados.filter(row => {
      const partes = row['Data Limite'].split('/')
      const dt = new Date(partes[2], partes[1] - 1, partes[0])
      dt.setHours(0, 0, 0, 0)
      return dt <= hoje
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([])

    const header = Object.keys(vencidos[0] || {})
    XLSX.utils.sheet_add_aoa(ws, [header])

    vencidos.forEach(row => {
      XLSX.utils.sheet_add_aoa(ws, [Object.values(row)], { origin: -1 })
    })

    XLSX.utils.book_append_sheet(wb, ws, 'Pendências')
    XLSX.writeFile(wb, 'pendencias_mob.xlsx')
  }

  const limparFiltros = () => {
    const inicial = {}
    Object.keys(filtros).forEach(c => inicial[c] = [])
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
            <button onClick={() => window.location.reload()}>🔄 Novo Upload</button>
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
