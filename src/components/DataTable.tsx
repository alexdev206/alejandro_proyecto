import React, { useState } from 'react';
import { 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Edit2, 
  Plus, 
  Trash2, 
  Eye, 
  Filter,
  Check,
  X,
  FileText,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { ColumnDefinition, ExtractedRow } from '../types';
import { PatientFieldInspector } from './PatientFieldInspector';

interface DataTableProps {
  columns: ColumnDefinition[];
  rows: ExtractedRow[];
  onRowsChange: (updatedRows: ExtractedRow[]) => void;
  documentTitle: string;
  selectedFieldFilter?: string | null;
  onSelectFieldFilter?: (colKey: string | null) => void;
  onTriggerToast?: (msg: string) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  rows,
  onRowsChange,
  documentTitle,
  selectedFieldFilter = null,
  onSelectFieldFilter,
  onTriggerToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyReview, setOnlyReview] = useState(false);
  const [onlySelectedFieldIssues, setOnlySelectedFieldIssues] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [inspectedRow, setInspectedRow] = useState<ExtractedRow | null>(null);

  // Filter rows
  const filteredRows = rows.filter((row) => {
    if (onlyReview && (!row.reviewFlags || row.reviewFlags.length === 0)) {
      return false;
    }
    if (selectedFieldFilter && onlySelectedFieldIssues) {
      const v = row.validation?.[selectedFieldFilter];
      if (!v || v.status === 'ok') return false;
    }
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    return Object.values(row.data).some((val) => 
      String(val || '').toLowerCase().includes(term)
    );
  });

  const handleStartEdit = (rowId: string, colKey: string, currentValue: string) => {
    setEditingCell({ rowId, colKey });
    setEditValue(currentValue || '');
  };

  const handleSaveEdit = (rowId: string, colKey: string) => {
    const updated = rows.map((r) => {
      if (r.id === rowId) {
        const newData = { ...r.data, [colKey]: editValue };
        const newValidation = { ...r.validation };
        
        // Remove from review flags if user corrected it
        const newFlags = (r.reviewFlags || []).filter(f => f !== colKey);

        if (editValue.toUpperCase() === '[ILEGIBLE]') {
          newValidation[colKey] = { status: 'ilegible', message: 'Marcada como ilegible' };
          newFlags.push(colKey);
        } else {
          newValidation[colKey] = { status: 'ok' };
        }

        return {
          ...r,
          data: newData,
          validation: newValidation,
          reviewFlags: newFlags,
        };
      }
      return r;
    });

    onRowsChange(updated);
    setEditingCell(null);
    if (onTriggerToast) onTriggerToast('✏️ Celda actualizada con éxito.');
  };

  const handleDeleteRow = (rowId: string, rowNum?: number) => {
    const displayNum = rowNum || rows.find(r => r.id === rowId)?.rowNumber;
    if (window.confirm(`¿Confirmas eliminar la fila #${displayNum}?`)) {
      const updated = rows.filter(r => r.id !== rowId).map((r, i) => ({ ...r, rowNumber: i + 1 }));
      onRowsChange(updated);
      if (onTriggerToast) onTriggerToast(`🗑️ Fila #${displayNum} eliminada.`);
    }
  };

  const handleClearAllRows = () => {
    if (rows.length === 0) return;
    if (window.confirm('¿Confirmas que deseas eliminar todas las filas de la matriz actual? Esta acción no se puede deshacer.')) {
      onRowsChange([]);
      if (onTriggerToast) onTriggerToast('🗑️ Todas las filas han sido eliminadas.');
    }
  };

  const handleAddRow = () => {
    const newRowId = `row-${Date.now()}`;
    const emptyData: Record<string, string> = {};
    columns.forEach(c => { emptyData[c.key] = ''; });

    const newRow: ExtractedRow = {
      id: newRowId,
      rowNumber: rows.length + 1,
      pageNumber: 1,
      data: emptyData,
      validation: {},
      reviewFlags: []
    };

    onRowsChange([...rows, newRow]);
    if (onTriggerToast) onTriggerToast(`➕ Nueva fila #${rows.length + 1} agregada a la matriz.`);
  };

  const handleSaveInspectedRow = (updatedRow: ExtractedRow) => {
    const updated = rows.map(r => r.id === updatedRow.id ? updatedRow : r);
    onRowsChange(updated);
    setInspectedRow(updatedRow);
    if (onTriggerToast) onTriggerToast('✅ Ficha clínica del paciente guardada.');
  };

  return (
    <>
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs transition-all">
        {/* Table Action Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar en datos extraídos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setOnlyReview(!onlyReview)}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                onlyReview
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-amber-600" />
              <span>Ver solo con alertas</span>
            </button>

            {selectedFieldFilter && (
              <button
                type="button"
                onClick={() => setOnlySelectedFieldIssues(!onlySelectedFieldIssues)}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  onlySelectedFieldIssues
                    ? 'bg-blue-100 border-blue-300 text-blue-900'
                    : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50'
                }`}
              >
                <span>Solo anomalías en {columns.find(c => c.key === selectedFieldFilter)?.label || selectedFieldFilter}</span>
              </button>
            )}

            {filteredRows.length > 0 && (
              <button
                type="button"
                onClick={() => setInspectedRow(filteredRows[0])}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                title="Abrir inspector de campos detallado"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Examinar Ficha de Campos</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-600">
            <span className="font-medium font-mono mr-1">
              <b>{filteredRows.length}</b> de <b>{rows.length}</b> filas
            </span>
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-medium text-slate-700 shadow-2xs cursor-pointer"
              title="Agregar un nuevo renglón vacío"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Agregar fila</span>
            </button>
            <button
              type="button"
              onClick={handleClearAllRows}
              disabled={rows.length === 0}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg font-medium shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Eliminar todas las filas de la tabla"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Vaciar</span>
            </button>
          </div>
        </div>

        {/* Interactive Table Container */}
        <div className="overflow-x-auto max-h-[520px] divide-y divide-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 font-bold sticky top-0 z-10 shadow-2xs">
              <tr>
                <th className="px-3 py-2.5 border-b border-slate-200 w-12 text-center">N°</th>
                <th className="px-3 py-2.5 border-b border-slate-200 text-center w-10">FICHA</th>
                {columns.map((col) => {
                  const isSelectedCol = selectedFieldFilter === col.key;
                  return (
                    <th 
                      key={col.key} 
                      onClick={() => onSelectFieldFilter && onSelectFieldFilter(isSelectedCol ? null : col.key)}
                      className={`px-3 py-2.5 border-b cursor-pointer transition-colors whitespace-nowrap select-none ${
                        isSelectedCol
                          ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                          : 'hover:bg-slate-200/80 border-slate-200'
                      }`}
                      title="Haz clic para enfocar este campo en toda la matriz"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span>{col.label || col.key}</span>
                        {isSelectedCol && (
                          <span className="text-[10px] bg-blue-700 text-white px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                            Activo
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="px-3 py-2.5 border-b border-slate-200 whitespace-nowrap text-amber-800">
                  AUDITORÍA
                </th>
                <th className="px-3 py-2.5 border-b border-slate-200 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 4} className="text-center py-10 text-slate-400">
                    No se encontraron filas que coincidan con la búsqueda o filtro.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const hasFlags = row.reviewFlags && row.reviewFlags.length > 0;
                  return (
                    <tr 
                      key={row.id} 
                      className={`hover:bg-slate-50/80 transition-colors group ${hasFlags ? 'bg-amber-50/20' : ''}`}
                    >
                      <td className="px-3 py-2 text-center font-mono text-slate-500 font-semibold">
                        {row.rowNumber}
                      </td>

                      {/* Open Field Inspector Button */}
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setInspectedRow(row)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          title="Abrir ficha completa de campos para este paciente"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {columns.map((col) => {
                        const val = row.data[col.key] || '';
                        const isEditing = editingCell?.rowId === row.id && editingCell?.colKey === col.key;
                        const cellValidation = row.validation?.[col.key];
                        const isDoubtful = cellValidation?.status === 'dudoso';
                        const isIllegible = cellValidation?.status === 'ilegible' || val === '[ILEGIBLE]';
                        const isSelectedCol = selectedFieldFilter === col.key;

                        let cellBg = '';
                        if (isIllegible) {
                          cellBg = 'bg-rose-50 text-rose-800 border-rose-200 font-medium';
                        } else if (isDoubtful) {
                          cellBg = 'bg-amber-50 text-amber-900 border-amber-200 font-medium';
                        } else if (isSelectedCol) {
                          cellBg = 'bg-blue-50/60 text-blue-950 font-medium border-x border-blue-100';
                        }

                        return (
                          <td 
                            key={col.key} 
                            className={`px-3 py-2 whitespace-nowrap group/cell relative ${cellBg}`}
                            title={cellValidation?.message || ''}
                          >
                            {isEditing ? (
                              <div className="flex items-center space-x-1">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit(row.id, col.key);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  autoFocus
                                  className="w-full px-1.5 py-0.5 text-xs border border-blue-500 rounded focus:outline-none bg-white text-slate-900 font-medium"
                                />
                                <button 
                                  onClick={() => handleSaveEdit(row.id, col.key)} 
                                  className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => setEditingCell(null)} 
                                  className="p-0.5 text-slate-400 hover:bg-slate-100 rounded"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div 
                                className="flex items-center justify-between space-x-2 cursor-pointer"
                                onClick={() => handleStartEdit(row.id, col.key, val)}
                              >
                                <span className={val ? 'text-slate-900' : 'text-slate-300 italic'}>
                                  {val || '—'}
                                </span>
                                <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </td>
                        );
                      })}

                      <td className="px-3 py-2 whitespace-nowrap">
                        {hasFlags ? (
                          <span 
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200"
                            title={row.reviewFlags.join(', ')}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Revisar ({row.reviewFlags.length})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>OK</span>
                          </span>
                        )}
                      </td>

                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id, row.rowNumber)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={`Eliminar fila #${row.rowNumber}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Legend and Compliance Note */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Válido</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
              <span>Ámbar: Dato dudoso / fuera de rango</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span>Rojo: Ilegible en escaneo</span>
            </span>
          </div>
          <span className="italic text-[11px] text-slate-500">
            Haz clic en 👁️ para examinar todos los campos o sobre una celda para editar rápido.
          </span>
        </div>
      </div>

      {/* Patient Field Inspector Drawer */}
      <PatientFieldInspector
        isOpen={!!inspectedRow}
        onClose={() => setInspectedRow(null)}
        row={inspectedRow}
        columns={columns}
        allRows={filteredRows}
        onSaveRow={handleSaveInspectedRow}
        onSelectRow={(r) => setInspectedRow(r)}
      />
    </>
  );
};

