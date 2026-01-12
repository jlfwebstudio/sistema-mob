import { useState } from "react";
import Upload from "./components/Upload";
import Table from "./components/Table";
import "./App.css";

function App() {
  const [dados, setDados] = useState([]);
  const [tabelaVisivel, setTabelaVisivel] = useState(false);

  function handleUpload(parsedRows) {
    setDados(parsedRows);
    setTabelaVisivel(true);
  }

  return (
    <div className={`App ${tabelaVisivel ? "tabela-visivel" : ""}`}>
      <header>
        <h1>MOBYAN - Gestão de Chamados</h1>
        <p>Painel automático de priorização e acompanhamento</p>
      </header>

      <Upload onUpload={handleUpload} />

      {tabelaVisivel && (
        <Table data={dados} />
      )}
    </div>
  );
}

export default App;
