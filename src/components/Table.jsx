import { useState, useMemo } from "react";

function Table({ data }) {
  // Colunas na ORDEM EXATA que você pediu
  const colunas = [
    "Origem",
    "Chamado",
    "Numero Referencia",
    "Contratante",
    "Serviço",
    "Status",
    "Data Limite",
    "Cliente",
    "CNPJ / CPF",
    "Cidade",
    "Técnico",
    "Prestador",
    "Justificativa do Abono"
  ];

  // Filtros armazenam valores selecionados
  const [filtros, setFiltros] = useState({});

  function toggleFiltro(coluna, valor) {
    setFiltros((prev) => {
      const atual = prev[coluna] || [];
      const existe = atual.includes(valor);

      const novo = existe
        ? atual.filter((v) => v !== valor)
        : [...atual, valor];

      return { ...prev, [coluna]: novo };
    });
  }

  // Lista de valores únicos por coluna
  const valoresUnicos = useMemo(() => {
    const obj = {};
    colunas.forEach((col) => {
      obj[col] = [...new Set(data.map((r) => r[col] || ""))];
    });
    return obj;
  }, [data]);

  // Filtragem
  const dadosFiltrados = useMemo(() => {
    return data.filter((row) => {
      return Object.entries(filtros).every(([col, valores]) => {
        if (!valores.length) return true;
        return valores.includes(row[col]);
      });
    });
  }, [data, filtros]);

  // Cores das linhas (hoje / atrasado)
  function corLinha(row) {
    const v = row["Data Limite"];
    if (!v) return "";

    const [d, m, a] = v.split("/");
    const dataRow = new Date(a, m - 1, d);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (dataRow < hoje) return "row-atrasado";
    if (dataRow.getTime() === hoje.getTime()) return "row-hoje";

    return "";
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {colunas.map((col) => (
              <th key={col}>
                <div className="th-content">
                  <span>{col}</span>

                  <div className="filter-dropdown">
                    <button className="filter-btn">▼</button>

                    <div className="filter-menu">
                      {valoresUnicos[col].map((valor) => (
                        <label key={valor} className="filter-option">
                          <input
                            type="checkbox"
                            checked={(filtros[col] || []).includes(valor)}
                            onChange={() => toggleFiltro(col, valor)}
                          />
                          {valor || "—"}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {dadosFiltrados.map((row, idx) => (
            <tr
              key={idx}
              className={`${idx % 2 === 0 ? "row-par" : "row-impar"} ${corLinha(row)}`}
            >
              {colunas.map((col) => (
                <td key={col}>{row[col] || "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
