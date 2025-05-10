
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import ptBR from "@/lib/i18n";

export interface FileUploadSectionProps {
  importFormat?: string;
  isImporting?: boolean;
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileData?: any[] | null;
}

export function FileUploadSection({ 
  importFormat = "xlsx", 
  isImporting = false, 
  onFileUpload,
  fileData = null,
}: FileUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{ptBR.selectFile}</label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          accept={
            importFormat === "xlsx" 
              ? ".xlsx,.xls" 
              : importFormat === "csv" 
                ? ".csv" 
                : ".json"
          }
          className="hidden"
          onChange={onFileUpload}
          disabled={isImporting}
        />
        <label 
          htmlFor="file-upload" 
          className="flex flex-col items-center cursor-pointer"
        >
          <Upload className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm text-gray-600">
            Clique para selecionar ou arraste um arquivo
          </span>
          <span className="text-xs text-gray-400 mt-1">
            {importFormat === "xlsx" 
              ? "Arquivos Excel (.xlsx, .xls)" 
              : importFormat === "csv" 
                ? "Arquivos CSV (.csv)" 
                : "Arquivos JSON (.json)"}
          </span>
        </label>
      </div>
      
      {!fileData && (
        <div className="flex justify-center mt-4">
          <Button 
            onClick={() => document.getElementById('file-upload')?.click()}
            className="bg-massage-500 hover:bg-massage-600"
            disabled={isImporting}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isImporting ? "Processando..." : "Selecionar Arquivo"}
          </Button>
        </div>
      )}
    </div>
  );
}
