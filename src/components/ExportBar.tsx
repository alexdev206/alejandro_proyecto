import React, { useState } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  RotateCcw, 
  Share2,
  FileDown,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { ColumnDefinition, ExtractedRow, ScanOptions } from '../types';
import { downloadCsv, downloadExcel, generateCsvContent } from '../utils/export';

interface ExportBarProps {
  columns: ColumnDefinition[];
  rows: ExtractedRow[];
  documentTitle: string;
  options: ScanOptions;
  onOptionsChange: (newOptions: ScanOptions) => void;
  onReset: () => void;
  onOpenConsultaPaiAdres?: () => void;
}

export const ExportBar: React.FC<ExportBarProps> = ({
  columns,
  rows,
  documentTitle,
  options,
  onOptionsChange,
  onReset,
  onOpenConsultaPaiAdres,
}) => {
  const [copied, setCopied] = useState(false);

  const cleanDocTitle = documentTitle
    ? documentTitle.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)
    : 'transcripcion';
  const baseFileName = `${cleanDocTitle}_${new Date().toISOString().slice(0, 10)}`;

  const handleDownloadCsv = () => {
    downloadCsv(columns, rows, `${baseFileName}.csv`, options.delimiter);
  };

  const handleDownloadExcel = () => {
    downloadExcel(columns, rows, documentTitle, `${baseFileName}.xlsx`);
  };

  const handleCopyClipboard = async () => {
    const csvData = generateCsvContent(columns, rows, '\t', true);
    try {
      await navigator.clipboard.writeText(csvData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      {/* Left: Export Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          id="btn-download-csv"
          onClick={handleDownloadCsv}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs sm:text-sm shadow-xs transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Descargar CSV Estructurado</span>
        </button>

        <button
          type="button"
          id="btn-download-excel"
          onClick={handleDownloadExcel}
          className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs sm:text-sm shadow-xs transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Descargar Excel (.xlsx)</span>
        </button>

        <button
          type="button"
          id="btn-copy-tsv"
          onClick={handleCopyClipboard}
          className="inline-flex items-center space-x-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs sm:text-sm border border-slate-300 transition-colors"
          title="Copiar datos para pegar en Excel o Google Sheets"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
          <span>{copied ? '¡Copiado!' : 'Copiar (TSV)'}</span>
        </button>

        {onOpenConsultaPaiAdres && (
          <button
            type="button"
            id="btn-open-pai-adres"
            onClick={onOpenConsultaPaiAdres}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            title="Validar estos pacientes en el módulo PAI / ADRES"
          >
            <ShieldCheck className="w-4 h-4 text-purple-700" />
            <span>Consultar en PAI / ADRES</span>
          </button>
        )}
      </div>

      {/* Right: Delimiter & New Document */}
      <div className="flex items-center space-x-3 text-xs text-slate-600">
        <div className="flex items-center space-x-1.5">
          <label className="text-slate-500 font-medium">Separador CSV:</label>
          <select
            value={options.delimiter}
            onChange={(e) => onOptionsChange({ ...options, delimiter: e.target.value as any })}
            className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-semibold"
          >
            <option value=";">Punto y coma ( ; )</option>
            <option value=",">Coma ( , )</option>
            <option value="&#9;">Tabulación</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center space-x-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors font-medium border border-slate-200"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Escanear otro PDF</span>
        </button>
      </div>
    </div>
  );
};
