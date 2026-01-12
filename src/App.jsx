import { useState, useMemo } from 'react'
import Upload from './components/Upload'
import Table from './components/Table'
import * as XLSX from 'xlsx'
import './App.css'

function App() {
  const [dados, setDados] = useState([])
  const [tabelaVisivel, setTabelaVisivel] = useState(false)
  const [filtros, setFiltros] = useState({})

  const receberUpload = (processados) => {
    setDados(processados)
    setTabelaVisivel(true)

    const inicial = {}
    if (processados.length > 0) {
      Object.keys(processados[0]).forEach(c => {
        inicial[c] = []
      })
    }
    setFiltros(inicial)
  }

  const dadosFiltrados = useMemo(() => {
    return dados.filter(row => {
      return Object.keys(filtros).every(col => {
        const selecionados = filtros[col]
        if (!selecionados || selecionados.length === 0) return true

        const valor = row[col] ? String(row[col]) : '(Vazio)'
        return selecionados.includes(valor)
      })
    })
  }, [dados, filtros])

  const temFiltros = useMemo(() => {
    return Object.values(filtros).some(arr => arr && arr.length > 0)
  }, [filtros])

  const exportarPendencias = () => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    // Filtra apenas registros com Data Limite <= HOJE
    const vencidos = dadosFiltrados.filter(r => {
      const str = r['Data Limite']
      if (!str) return false
      const [d, m, a] = str.split('/')
      const dt = new Date(a, m - 1, d)
      dt.setHours(0, 0, 0, 0)
      return dt <= hoje
    })

    if (vencidos.length === 0) {
      alert('Nenhuma pendência vencida ou para hoje.')
      return
    }

    const wb = XLSX.utils.book_new()
    const cab = Object.keys(vencidos[0])

    // Cria worksheet vazio
    const ws = XLSX.utils.aoa_to_sheet([cab])

    // Adiciona dados
    vencidos.forEach(r => {
      const linha = cab.map(c => r[c])
      XLSX.utils.sheet_add_aoa(ws, [linha], { origin: -1 })
    })

    // Define largura das colunas
    ws['!cols'] = cab.map(() => ({ wch: 18 }))

    // Estilização do cabeçalho
    const range = XLSX.utils.decode_range(ws['!ref'])
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '1'
      if (!ws[address]) continue
      ws[address].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '274472' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    }

    // Estilização das linhas (cores de prioridade)
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const dataLimiteCol = cab.indexOf('Data Limite')
      if (dataLimiteCol === -1) continue

      const cellAddr = XLSX.utils.encode_cell({ r: R, c: dataLimiteCol })
      const cell = ws[cellAddr]
      if (!cell || !cell.v) continue

      const str = String(cell.v)
      const [d, m, a] = str.split('/')
      const dt = new Date(a, m - 1, d)
      dt.setHours(0, 0, 0, 0)

      let cor = 'FFFFFF'
      if (dt < hoje) {
        cor = 'FFCCCC' // Vermelho claro (atrasado)
      } else if (dt.getTime() === hoje.getTime()) {
        cor = 'FFF4CC' // Amarelo claro (hoje)
      }

      // Aplica cor em todas as células da linha
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C })
        if (!ws[addr]) ws[addr] = { t: 's', v: '' }
        ws[addr].s = {
          fill: { fgColor: { rgb: cor } },
          border: {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
          }
        }
      }
    }

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
