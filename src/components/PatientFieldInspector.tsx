import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  AlertTriangle, 
  HelpCircle, 
  User, 
  MapPin, 
  ShieldCheck, 
  Activity, 
  FileText, 
  Save, 
  Sparkles,
  Phone,
  Building,
  Calendar,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { ColumnDefinition, ExtractedRow } from '../types';

interface PatientFieldInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  row: ExtractedRow | null;
  columns: ColumnDefinition[];
  allRows: ExtractedRow[];
  onSaveRow: (updatedRow: ExtractedRow) => void;
  onSelectRow: (row: ExtractedRow) => void;
}

export const PatientFieldInspector: React.FC<PatientFieldInspectorProps> = ({
  isOpen,
  onClose,
  row,
  columns,
  allRows,
  onSaveRow,
  onSelectRow,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [validationData, setValidationData] = useState<Record<string, any>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'identification' | 'contact' | 'health' | 'audit'>('all');

  useEffect(() => {
    if (row) {
      setFormData({ ...row.data });
      setValidationData({ ...(row.validation || {}) });
      setHasUnsavedChanges(false);
    }
  }, [row]);

  if (!isOpen || !row) return null;

  const currentIndex = allRows.findIndex((r) => r.id === row.id);
  const totalCount = allRows.length;

  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectRow(allRows[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalCount - 1) {
      onSelectRow(allRows[currentIndex + 1]);
    }
  };

  const handleChangeField = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);

    // Update validation state
    setValidationData((prev) => {
      const copy = { ...prev };
      if (value.toUpperCase() === '[ILEGIBLE]') {
        copy[key] = { status: 'ilegible', message: 'Marcada como ilegible' };
      } else {
        copy[key] = { status: 'ok' };
      }
      return copy;
    });
  };

  const handleSave = () => {
    if (!row) return;

    // Recompute reviewFlags
    const flags: string[] = [];
    Object.keys(validationData).forEach((k) => {
      if (validationData[k]?.status === 'dudoso' || validationData[k]?.status === 'ilegible') {
        flags.push(k);
      }
    });

    const updatedRow: ExtractedRow = {
      ...row,
      data: formData,
      validation: validationData,
      reviewFlags: flags,
    };

    onSaveRow(updatedRow);
    setHasUnsavedChanges(false);
  };

  // Group fields semantically
  const idFields = columns.filter(c => 
    /tipo|doc|ident|nombre|apellido|sexo|edad|fecha_nac/i.test(c.key) ||
    /identificación|nombre|apellido|cédula/i.test(c.label || '')
  );

  const contactFields = columns.filter(c => 
    /tel|dir|localidad|barrio|upz|municipio|departamento|correo/i.test(c.key) ||
    /teléfono|dirección|ubicación|barrio/i.test(c.label || '')
  );

  const healthFields = columns.filter(c => 
    /eps|eapb|regimen|vacuna|biologico|fum|gestac|peso|talla/i.test(c.key) ||
    /aseguramiento|régimen|clínico|vacunación/i.test(c.label || '')
  );

  const otherFields = columns.filter(c => 
    !idFields.some(x => x.key === c.key) &&
    !contactFields.some(x => x.key === c.key) &&
    !healthFields.some(x => x.key === c.key)
  );

  const renderFieldInput = (col: ColumnDefinition) => {
    const val = formData[col.key] ?? '';
    const status = validationData[col.key]?.status || 'ok';
    const message = validationData[col.key]?.message;

    return (
      <div key={col.key} className="space-y-1.5 bg-slate-50/60 p-3 rounded-xl border border-slate-200/80 transition-all hover:border-slate-300">
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold text-slate-800 tracking-tight flex items-center space-x-1.5">
            <span>{col.label || col.key}</span>
            <span className="font-mono text-[10px] text-slate-400 font-normal">({col.key})</span>
          </label>

          {/* Status badge */}
          <div className="flex items-center space-x-1">
            {status === 'ilegible' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                <HelpCircle className="w-3 h-3" />
                <span>Ilegible</span>
              </span>
            )}
            {status === 'dudoso' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                <AlertTriangle className="w-3 h-3" />
                <span>Revisar</span>
              </span>
            )}
            {status === 'ok' && val.trim() !== '' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-emerald-700 bg-emerald-50">
                <Check className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            value={val}
            onChange={(e) => handleChangeField(col.key, e.target.value)}
            placeholder={`Sin dato (${col.key})`}
            className={`w-full px-3 py-2 text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 transition-all font-mono ${
              status === 'dudoso'
                ? 'border-amber-400 focus:ring-amber-400 bg-amber-50/30'
                : status === 'ilegible'
                ? 'border-purple-400 focus:ring-purple-400 bg-purple-50/30'
                : 'border-slate-300 focus:ring-blue-600 focus:border-transparent'
            }`}
          />
        </div>

        {message && (
          <p className="text-[11px] text-amber-700 font-medium">{message}</p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Ficha Detallada del Paciente
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-slate-300">
                  #{row.rowNumber || currentIndex + 1} de {totalCount}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Edición de todos los campos extraídos y validación asistida
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {/* Prev / Next buttons */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex <= 0}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Paciente anterior (Flecha Izq)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex >= totalCount - 1}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Paciente siguiente (Flecha Der)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer ml-2"
              title="Cerrar ficha"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 px-6 py-2.5 bg-slate-100 border-b border-slate-200 text-xs overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos los Campos ({columns.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('identification')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'identification'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Identificación ({idFields.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'contact'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ubicación y Contacto ({contactFields.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'health'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aseguramiento y Salud ({healthFields.length})
          </button>
        </div>

        {/* Scrollable Fields Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'all' ? (
            <>
              {idFields.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-1.5">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>1. Datos de Identificación y Paciente</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {idFields.map(renderFieldInput)}
                  </div>
                </div>
              )}

              {contactFields.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>2. Ubicación, Residencia y Contacto</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {contactFields.map(renderFieldInput)}
                  </div>
                </div>
              )}

              {healthFields.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>3. Aseguramiento en Salud y Clínico</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {healthFields.map(renderFieldInput)}
                  </div>
                </div>
              )}

              {otherFields.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-slate-600" />
                    <span>4. Variables Complementarias y Observaciones</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {otherFields.map(renderFieldInput)}
                  </div>
                </div>
              )}
            </>
          ) : activeTab === 'identification' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {idFields.map(renderFieldInput)}
            </div>
          ) : activeTab === 'contact' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contactFields.map(renderFieldInput)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {healthFields.map(renderFieldInput)}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            {hasUnsavedChanges ? (
              <span className="text-amber-700 font-bold flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Hay cambios pendientes por guardar</span>
              </span>
            ) : (
              <span className="text-emerald-700 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ficha sincronizada</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Ficha</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
