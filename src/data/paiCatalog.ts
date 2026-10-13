export const CAMPOS_PAI: Record<string, { label: string; sel: string; tipo: 'input' | 'select' }> = {
  td: { label: 'Tipo Doc', sel: '#ContentPlaceHolder1_ddl_TipoIdentificacion, #ContentPlaceHolder1_txb_TipoIdentificacion', tipo: 'select' },
  identificacion: { label: 'Identificación', sel: '#ContentPlaceHolder1_txb_Identificacion', tipo: 'input' },
  nombre1: { label: 'Primer Nombre', sel: '#ContentPlaceHolder1_txb_Nombre1', tipo: 'input' },
  nombre2: { label: 'Segundo Nombre', sel: '#ContentPlaceHolder1_txb_Nombre2', tipo: 'input' },
  apellido1: { label: 'Primer Apellido', sel: '#ContentPlaceHolder1_txb_Apellido1', tipo: 'input' },
  apellido2: { label: 'Segundo Apellido', sel: '#ContentPlaceHolder1_txb_Apellido2', tipo: 'input' },
  fecha_de_nacimiento: { label: 'Fecha Nacimiento', sel: '#ContentPlaceHolder1_txb_FechaNacimiento', tipo: 'input' },
  sexo: { label: 'Sexo', sel: '#ContentPlaceHolder1_ddl_Sexo, #ContentPlaceHolder1_txb_Sexo', tipo: 'select' },
  genero: { label: 'Género', sel: '#ContentPlaceHolder1_ddl_Genero', tipo: 'select' },
  telefono1: { label: 'Teléfono 1', sel: '#ContentPlaceHolder1_txb_Telefono, #ContentPlaceHolder1_txb_Telefono1', tipo: 'input' },
  telefono2: { label: 'Teléfono 2', sel: '#ContentPlaceHolder1_txb_Telefono2, #ContentPlaceHolder1_txb_Celular', tipo: 'input' },
  direccion: { label: 'Dirección', sel: '#ContentPlaceHolder1_txb_Direccion', tipo: 'input' },
  direccionadicional: { label: 'Dir. Adicional', sel: '#ContentPlaceHolder1_txb_DireccionAdicional', tipo: 'input' },
  departamento: { label: 'Departamento', sel: '#ContentPlaceHolder1_ddl_Departamento', tipo: 'select' },
  municipio: { label: 'Municipio', sel: '#ContentPlaceHolder1_ddl_Municipio', tipo: 'select' },
  localidad: { label: 'Localidad', sel: '#ContentPlaceHolder1_ddl_Localidad', tipo: 'select' },
  upz: { label: 'UPZ', sel: '#ContentPlaceHolder1_ddl_Upz, #ContentPlaceHolder1_txb_Upz', tipo: 'select' },
  barrio: { label: 'Barrio', sel: '#ContentPlaceHolder1_ddl_Barrio, #ContentPlaceHolder1_txb_Barrio', tipo: 'select' },
  eapb: { label: 'EAPB / EPS', sel: '#ContentPlaceHolder1_ddl_Aseguradora, #ContentPlaceHolder1_ddl_EAPB, #ContentPlaceHolder1_txb_Eapb', tipo: 'select' },
  regimen: { label: 'Régimen', sel: '#ContentPlaceHolder1_ddl_Regimen', tipo: 'select' },
  // Madre (solo menores)
  tdmadre: { label: 'Tipo Doc Madre', sel: '#ContentPlaceHolder1_ddl_TipoIdentificacionMadre', tipo: 'select' },
  docmadre: { label: 'Doc Madre', sel: '#ContentPlaceHolder1_txb_NumeroIdentificacionMadre', tipo: 'input' },
  nombrem1: { label: 'Primer Nombre Madre', sel: '#ContentPlaceHolder1_txb_PrimerNombreMadre', tipo: 'input' },
  nombrem2: { label: 'Segundo Nombre Madre', sel: '#ContentPlaceHolder1_txb_SegundoNombreMadre', tipo: 'input' },
  apellidomadre1: { label: 'Primer Apellido Madre', sel: '#ContentPlaceHolder1_txb_PrimerApellidoMadre', tipo: 'input' },
  apellidomadre2: { label: 'Segundo Apellido Madre', sel: '#ContentPlaceHolder1_txb_SegundoApellidoMadre', tipo: 'input' },
};

export const PRESETS_PAI: Record<string, string[]> = {
  '1': ['td', 'nombre2', 'apellido2', 'fecha_de_nacimiento', 'sexo', 'genero'],
  '2': ['telefono1', 'telefono2'],
  '3': ['direccion', 'municipio', 'departamento', 'localidad', 'barrio', 'upz', 'direccionadicional'],
  '4': ['eapb', 'regimen'],
  '5': ['tdmadre', 'docmadre', 'nombrem1', 'nombrem2', 'apellidomadre1', 'apellidomadre2'],
};

export const OPCIONES_ADRES = {
  columnasDisponibles: [
    { key: 'tipo_documento', label: 'Tipo Documento' },
    { key: 'numero_identificacion', label: 'Número Identificación' },
    { key: 'primer_apellido', label: 'Primer Apellido' },
    { key: 'segundo_apellido', label: 'Segundo Apellido' },
    { key: 'primer_nombre', label: 'Primer Nombre' },
    { key: 'segundo_nombre', label: 'Segundo Nombre' },
    { key: 'departamento', label: 'Departamento' },
    { key: 'municipio', label: 'Municipio' },
    { key: 'estado', label: 'Estado Afiliación' },
    { key: 'entidad', label: 'EPS / Entidad' },
    { key: 'regimen', label: 'Régimen' },
    { key: 'fecha_afiliacion', label: 'Fecha Afiliación' },
    { key: 'tipo_afiliado', label: 'Tipo Afiliado' },
  ],
  defaults: {
    sexo: true,
    tabla_origen: true,
  }
};
