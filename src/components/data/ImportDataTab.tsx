import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient'; // Ajuste se o seu caminho do supabase for outro
import { toast } from 'react-toastify';

interface TableOption {
  id: string;
  name: string;
}

const tables: TableOption[] = [
  { id: "customer", name: "Clientes" },
  // Adicione outras tabelas, seguindo sempre o nome igual ao do banco!
];

const ImportDataTab: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'upload' | 'mapping'>('upload');
  const [loading, setLoading] = useState<boolean>(false);

  // Função para buscar as colunas da tabela do banco
  const fetchTableColumns = async (tableName: string) => {
    try {
      const { data, error } = await supabase.rpc('get_table_columns', { table_name: tableName });
      if (error) throw error;
      // Garante array apenas de strings
      if (Array.isArray(data) && data.length && typeof data[0] === "object" && "column_name" in data[0]) {
        setTableColumns(data.map((col: any) => String(col.column_name)));
      } else if (Array.isArray(data)) {
        setTableColumns(data.map(col => String(col)));
      } else {
        setTableColumns([]);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar colunas da tabela: " + (error.message || error));
      setTableColumns([]);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      fetchTableColumns(selectedTable);
      setSheetData([]);
      setPreviewData([]);
      setMappings({});
      setActiveTab('upload');
    }
  }, [selectedTable]);

  // Manipular upload do arquivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Falha ao ler arquivo");
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        if (jsonData.length < 2) {
          toast.error("O arquivo não contém dados suficientes");
          return;
        }
        const headers = jsonData[0] as (string | undefined)[];
        if (!headers || !headers.length) {
          toast.error("Arquivo sem cabeçalhos.");
          return;
        }

        // Garante que todos os headers sejam string
        const normalizedHeaders = headers.map(h => String(h).trim());

        // Garante que todas as colunas do banco são string
        const onlyStringTableColumns = tableColumns.filter(col => typeof col === "string").map(col => String(col).trim());

        // Cria mapeamento inicial, se possível
        const initialMapping: Record<string, string> = {};
        normalizedHeaders.forEach((sheetCol) => {
          const matchingDbColumn = onlyStringTableColumns.find(
            dbCol => dbCol.toLowerCase() === sheetCol.toLowerCase()
          );
          if (matchingDbColumn) initialMapping[sheetCol] = matchingDbColumn;
        });
        setMappings(initialMapping);

        // Monta dados das linhas do arquivo
        const dataRows = jsonData.slice(1).map((row: any[]) => {
          const obj: Record<string, any> = {};
          normalizedHeaders.forEach((header, idx) => {
            if (header) obj[header] = row[idx];
          });
          return obj;
        });
        setSheetData(dataRows);
        setPreviewData(dataRows.slice(0, 5));
        setActiveTab('mapping');
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        toast.error("Erro ao processar o arquivo");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Função para submeter importação (exemplo didático, adapte conforme sua lógica)
  const handleImport = async () => {
    try {
      setLoading(true);
      // Adapte esse trecho conforme sua API/endpoint!
      /* Exemplo: */
      // const response = await supabase.from(selectedTable).insert(sheetData);
      toast.success("Importação concluída (simulação)");
      setLoading(false);
    } catch (error) {
      toast.error("Erro ao importar dados");
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Importar Dados</h2>
      <div>
        <label>Selecione uma tabela:</label>
        <select value={selectedTable} onChange={e => setSelectedTable(e.target.value)}>
          <option value="">Selecione...</option>
          {tables.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {selectedTable && (
        <div>
          <label>Arquivo (Excel ou CSV):</label>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
        </div>
      )}

      {/* Preview dos dados e mapeamento */}
      {activeTab === "mapping" && (
        <div>
          <h3>Prévia dos dados:</h3>
          <table>
            <thead>
              <tr>
                {Object.keys(mappings).map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, idx) => (
                <tr key={idx}>
                  {Object.keys(mappings).map(h => <td key={h}>{row[h]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleImport} disabled={loading}>
            {loading ? "Importando..." : "Importar"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ImportDataTab;