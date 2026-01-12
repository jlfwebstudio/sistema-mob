import { useState } from "react";
import * as XLSX from "xlsx";

function Upload({ onUpload }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);

  function normalizarData(v) {
    if (!v && v !== 0) return "";

    // Caso Date()
    if (v instanceof Date) {
      const d = String(v.getDate()).padStart(2, "0");
      const m = String(v.getMonth() + 1).padStart(2, "0");
      const a = v.getFullYear();
      return `${d}/${m}/${a}`;
    }

    // Caso número Excel
    if (typeof v === "number") {
      const p = XLSX.SSF.parse_date_code(v);
      if (!p) return "";
      return `${String(p.d).padStart(2, "0")}/${String(p.m).padStart(2, "0")}/${p.y}`;
    }

    let s = String(v).trim();

    // Ignorar valores tipo "Mon", "Tue"
    const semana = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    if (semana.includes(s.toLowerCase())) return "";

    // Remover hora → "2026-01-12 00:00:00"
    if (s.includes(" ")) s = s.split(" ")[0];

    // ISO → 2026-01-12
    const iso = s.split("-");
    if (iso.length === 3 && iso[0].length === 4) {
      return `${iso[2]}/${iso[1]}/${iso[0]}`;
    }

    // Formatos com barras
    if (s.includes("/")) {
      const partes = s.split("/");
      if (partes.length === 3) {
        const p1 = parseInt(partes[0]);
        const p2 = parseInt(partes[1]);
        const ano = partes[2];

        // Se p1 > 12 → é dia
        if (p1 > 12) return `${p1}/${p2}/${ano}`;
        // Se p2 > 12 → p2 é dia → mm/dd/yyyy
        if (p2 > 12) return `${p2}/${p1}/${ano}`;
        // Ambos <= 12 → assume padrão BR
        return `${partes[0].padStart(2, "0")}/${partes[1].padStart(2, "0")}/${ano}`;
      }
    }

    return "";
  }

  function limparCpfCnpj(v) {
    if (!v) return "";
    return String(v).replace(/["'=]/g, "").trim();
  }

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (typeof onUpload !== "function") {
      setError("Erro interno: callback não encontrado");
      return;
    }

    setLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const bruto = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!bruto || !bruto.length) {
        setError("Arquivo vazio");
        setLoading(false);
        return;
      }

      const final = bruto.map((row) => ({
        "Origem": "MOB",
        "Chamado": row["Chamado"] || "",
        "Numero Referencia": row["Numero Referencia"] || "",
        "Contratante": row["Contratante"] || "",
        "Serviço": row["Serviço"] || "",
        "Status": row["Status"] || "",
        "Data Limite": normalizarData(row["Data Limite"]),
        "Cliente": row["Nome Cliente"] || "",
        "CNPJ / CPF": limparCpfCnpj(row["CNPJ / CPF"]),
        "Cidade": row["Cidade"] || "",
        "Técnico": row["Técnico"] || "",
        "Prestador": row["Prestador"] || "",
        "Justificativa do Abono": row["Justificativa do Abono"] || ""
      }));

      onUpload(final);
    } catch (err) {
      console.error(err);
      setError("Erro ao processar arquivo");
    }

    setLoading(false);
  };

  return (
    <div className="upload-box">
      <h2>Envie o relatório Mob</h2>
      <p>Selecione arquivo Excel/CSV</p>

      <label className="file-input-label">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          disabled={loading}
          style={{ display: "none" }}
        />
        <span className="file-input-button">
          {loading ? "⏳ Processando..." : "📂 Escolher arquivo"}
        </span>
      </label>

      {fileName && <p className="file-name">✓ {fileName}</p>}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default Upload;
