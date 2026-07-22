const COLORS = {
  programada:  'bg-blue-100 text-blue-700',
  confirmada:  'bg-cyan-100 text-cyan-700',
  en_espera:   'bg-yellow-100 text-yellow-700',
  en_consulta: 'bg-purple-100 text-purple-700',
  atendida:    'bg-green-100 text-green-700',
  cancelada:   'bg-red-100 text-red-700',
  no_asistio:  'bg-gray-100 text-gray-500',
  consulta:    'bg-blue-100 text-blue-700',
  procedimiento:'bg-orange-100 text-orange-700',
  cirugia:     'bg-red-100 text-red-700',
}

const LABELS = {
  programada: 'Programada', confirmada: 'Confirmada',
  en_espera: 'En espera', en_consulta: 'En consulta',
  atendida: 'Atendida', cancelada: 'Cancelada', no_asistio: 'No asistió',
  consulta: 'Consulta', procedimiento: 'Procedimiento', cirugia: 'Cirugía',
}

export default function Badge({ value }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${COLORS[value] || 'bg-gray-100 text-gray-600'}`}>
      {LABELS[value] || value}
    </span>
  )
}
