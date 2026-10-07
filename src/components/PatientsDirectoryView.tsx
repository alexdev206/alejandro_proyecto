import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit3, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  ShieldCheck, 
  Baby, 
  ArrowRight,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ColumnDefinition, ExtractedRow } from '../types';
import { PatientFieldInspector } from './PatientFieldInspector';

interface PatientsDirectoryViewProps {
  rows: ExtractedRow[];
  columns: ColumnDefinition[];
  onUpdateRows: (updatedRows: ExtractedRow[]) => void;
  onOpenConsultaPaiAdres: () => void;
  onTriggerToast: (msg: string) => void;
}

export const PatientsDirectoryView: React.FC<PatientsDirectoryViewProps> = ({
  rows,
  columns,
  onUpdateRows,
  onOpenConsultaPaiAdres,
  onTriggerToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'valid' | 'alerts' | 'validated_adres' | 'validated_pai'>('all');
  const [inspectedRow, setInspectedRow] = useState<ExtractedRow | null>(null);

  // Compute stats
  const stats = useMemo(() => {
    let withAlerts = 0;
    let validatedAdres = 0;
    let validatedPai = 0;

    rows.forEach(r => {
      if (r.reviewFlags && r.reviewFlags.length > 0) withAlerts++;
      const obs = String(r.data?.observaciones || '').toUpperCase();
      if (obs.includes('VALIDADO ADRES') || obs.includes('ADRES')) validatedAdres++;
      if (obs.includes('VALIDADO PAI') || obs.includes('PAI')) validatedPai++;
    });

    return {
      total: rows.length,
      clean: rows.length - withAlerts,
      withAlerts,
      validatedAdres,
      validatedPai,
    };
  }, [rows]);

  // Filtered list
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Type filter
      if (filterType === 'alerts') {
        if (!r.reviewFlags || r.reviewFlags.length === 0) return false;
      } else if (filterType === 'valid') {
        if (r.reviewFlags && r.reviewFlags.length > 0) return false;
      } else if (filterType === 'validated_adres') {
        const obs = String(r.data?.observaciones || '').toUpperCase();
        if (!obs.includes('ADRES')) return false;
      } else if (filterType === 'validated_pai') {
        const obs = String(r.data?.observaciones || '').toUpperCase();
        if (!obs.includes('PAI')) return false;
      }

      // Search term
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return Object.values(r.data || {}).some(val => 
        String(val || '').toLowerCase().includes(term)
      );
    });
  }, [rows, filterType, searchTerm]);

  const handleSaveInspectedRow = (updatedRow: ExtractedRow) => {
    const updated = rows.map(r => r.id === updatedRow.id ? updatedRow : r);
    onUpdateRows(updated);
    setInspectedRow(updatedRow);
    onTriggerToast('✅ Ficha del paciente actualizada.');
  };

  const handleAddPatient = () => {
    const newId = `pat-${Date.now()}`;
    const newDoc = window.prompt('Ingresa el número de documento del nuevo paciente:');
    if (!newDoc || !newDoc.trim()) return;

    const newPatient: ExtractedRow = {
      id: newId,
      rowNumber: 1,
      pageNumber: 1,
      data: {
        num_identificacion: newDoc.trim(),
        tipo_identificacion: '4',
        primer_nombre: 'NUEVO',
        primer_apellido: 'PACIENTE',
        edad: '',
        sexo: '',
        eps: 'PENDIENTE',
        observaciones: 'Ingresado manualmente al directorio'
      },
      validation: {},
      reviewFlags: []
    };

    const updated = [newPatient, ...rows].map((r, i) => ({ ...r, rowNumber: i + 1 }));
    onUpdateRows(updated);
    setInspectedRow(newPatient);
    onTriggerToast(`➕ Paciente ${newDoc.trim()} agregado. Abre su ficha para completar información.`);
  };

  const handleDeletePatient = (id: string) => {
    const target = rows.find(r => r.id === id);
    const doc = target?.data?.num_identificacion || target?.data?.documento || '';
    const name = `${target?.data?.primer_nombre || ''} ${target?.data?.primer_apellido || ''}`.trim();
    const label = doc ? `${doc} (${name || 'Paciente'})` : 'este paciente';

    if (window.confirm(`¿Confirmas que deseas eliminar a ${label} del directorio?`)) {
      const updated = rows.filter(r => r.id !== id).map((r, i) => ({ ...r, rowNumber: i + 1 }));
      onUpdateRows(updated);
      onTriggerToast(`🗑️ Paciente eliminado del directorio.`);
    }
  };

  const handleExportDirectoryExcel = () => {
    if (rows.length === 0) {
      onTriggerToast('⚠️ No hay pacientes para exportar.');
      return;
    }

    const data = rows.map((r, idx) => ({
      'N°': idx + 1,
      ...r.data,
      'ESTADO_AUDITORÍA': r.reviewFlags && r.reviewFlags.length > 0 ? r.reviewFlags.join('; ') : 'OK'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Directorio_Pacientes');
    XLSX.writeFile(wb, `directorio_pacientes_sisvan_${new Date().toISOString().slice(0, 10)}.xlsx`);
    onTriggerToast('📥 Directorio de pacientes exportado a Excel.');
  };

  const handleDeduplicatePatients = () => {
    if (rows.length === 0) {
      onTriggerToast('ℹ️ No hay pacientes en el directorio para deduplicar.');
      return;
    }

    const seen = new Set<string>();
    const deduplicated: ExtractedRow[] = [];
    let dupsCount = 0;

    for (const r of rows) {
      const doc = String(r.data?.num_identificacion || r.data?.documento || r.data?.id || r.id || '').trim();
      if (!doc || seen.has(doc)) {
        dupsCount++;
      } else {
        seen.add(doc);
        deduplicated.push(r);
      }
    }

    if (dupsCount === 0) {
      onTriggerToast('✅ Todos los registros son únicos. No se encontraron documentos duplicados.');
      return;
    }

    const renumbered = deduplicated.map((r, i) => ({ ...r, rowNumber: i + 1 }));
    onUpdateRows(renumbered);
    onTriggerToast(`✨ ¡Listo! Se eliminaron ${dupsCount} registros duplicados. Ahora hay ${renumbered.length} pacientes únicos.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner / Metric Strip */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Directorio Nominal de Pacientes SISVAN
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {stats.total} Pacientes Registrados
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Visualización, edición de fichas clínicas y cruce con plataformas distritales
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDeduplicatePatients}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
              title="Eliminar registros duplicados que tengan el mismo número de documento"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Deduplicar Pacientes</span>
            </button>

            <button
              type="button"
              onClick={handleAddPatient}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Registrar manualmente un nuevo paciente al directorio"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Paciente</span>
            </button>

            <button
              type="button"
              onClick={handleExportDirectoryExcel}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Exportar Excel</span>
            </button>

            <button
              type="button"
              onClick={onOpenConsultaPaiAdres}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-purple-200" />
              <span>Consultar en PAI / ADRES</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">100% Válidos</span>
            <span className="text-lg font-extrabold text-emerald-400 font-mono">{stats.clean}</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Con Alertas</span>
            <span className="text-lg font-extrabold text-amber-400 font-mono">{stats.withAlerts}</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Validados ADRES</span>
            <span className="text-lg font-extrabold text-purple-400 font-mono">{stats.validatedAdres}</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Validados PAI</span>
            <span className="text-lg font-extrabold text-blue-400 font-mono">{stats.validatedPai}</span>
          </div>
        </div>
      </div>

      {/* Directory Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por documento, nombre o EPS..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('alerts')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterType === 'alerts'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Con Alertas ({stats.withAlerts})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('validated_adres')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterType === 'validated_adres'
                    ? 'bg-purple-100 text-purple-900 border border-purple-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ADRES ({stats.validatedAdres})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('validated_pai')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterType === 'validated_pai'
                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                PAI ({stats.validatedPai})
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
            Mostrando <b>{filteredRows.length}</b> de <b>{rows.length}</b> registros
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 font-bold sticky top-0 z-10 shadow-2xs">
              <tr>
                <th className="px-4 py-3 border-b border-slate-200 w-12 text-center">N°</th>
                <th className="px-4 py-3 border-b border-slate-200">DOCUMENTO</th>
                <th className="px-4 py-3 border-b border-slate-200">NOMBRE COMPLETO</th>
                <th className="px-4 py-3 border-b border-slate-200">CONTACTO / TEL</th>
                <th className="px-4 py-3 border-b border-slate-200">ASEGURADORA (EAPB)</th>
                <th className="px-4 py-3 border-b border-slate-200">DICTAMEN / VALIDACIÓN</th>
                <th className="px-4 py-3 border-b border-slate-200 text-center w-24">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No se encontraron pacientes que coincidan con la búsqueda o filtro activo.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, idx) => {
                  const doc = r.data?.documento || r.data?.num_identificacion || r.data?.id || '—';
                  const tipoDoc = r.data?.tipoDocumento || r.data?.tipo_identificacion || r.data?.tipo_id || 'CC';
                  
                  const pNom = r.data?.primerNombre || r.data?.primer_nombre || r.data?.nombres || '';
                  const sNom = r.data?.segundoNombre || r.data?.segundo_nombre || '';
                  const pApe = r.data?.primerApellido || r.data?.primer_apellido || r.data?.apellidos || '';
                  const sApe = r.data?.segundoApellido || r.data?.segundo_apellido || '';
                  const fullName = `${pNom} ${sNom} ${pApe} ${sApe}`.trim() || 'SIN NOMBRE REGISTRADO';

                  const tel = r.data?.telefono || r.data?.telefono1 || '—';
                  const dir = r.data?.direccion || r.data?.direccion_residencia || '—';
                  const eps = r.data?.eapb || r.data?.eps || '—';
                  const obs = r.data?.observaciones || '';

                  const isAdresValid = obs.toUpperCase().includes('ADRES');
                  const isPaiValid = obs.toUpperCase().includes('PAI');

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-4 py-3 text-center font-mono text-slate-400 font-semibold">
                        {r.rowNumber || idx + 1}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">{doc}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-mono">{tipoDoc}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{fullName}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{dir}</div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono text-slate-700">{tel}</div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{eps}</span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isAdresValid && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                              ✓ ADRES OK
                            </span>
                          )}
                          {isPaiValid && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              ✓ PAI OK
                            </span>
                          )}
                          {!isAdresValid && !isPaiValid && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                              Pendiente validación
                            </span>
                          )}
                        </div>
                        {obs && (
                          <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5" title={obs}>
                            {obs}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setInspectedRow(r)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Abrir ficha completa de campos para editar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePatient(r.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar paciente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
    </div>
  );
};
