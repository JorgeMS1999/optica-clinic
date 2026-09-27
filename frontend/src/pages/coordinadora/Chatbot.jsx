import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Code } from 'lucide-react'
import api from '../../services/api'

const SUGERENCIAS = [
  '¿Cuántos procedimientos hubo hoy?',
  'Ingresos cobrados de este mes',
  'Cuántos ortópticos se hicieron en septiembre',
  'Top 5 servicios más facturados del mes',
  'Pacientes nuevos esta semana',
  'Citas por cobrar y su monto',
]

function Burbuja({ msg }) {
  const esUser = msg.role === 'user'
  const [verSql, setVerSql] = useState(false)
  return (
    <div className={`flex gap-2.5 ${esUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${esUser ? 'bg-blue-600' : 'bg-green-600'} text-white`}>
        {esUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
        esUser ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'}`}>
        {msg.content}
        {msg.error && <span className="text-red-500">{msg.error}</span>}
        {msg.sql && (
          <div className="mt-2">
            <button onClick={() => setVerSql(v => !v)} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600">
              <Code size={12} /> {verSql ? 'ocultar consulta' : 'ver consulta SQL'}
            </button>
            {verSql && (
              <pre className="mt-1 text-[11px] bg-gray-50 border border-gray-100 rounded-lg p-2 overflow-x-auto text-gray-600">{msg.sql}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Chatbot() {
  const [mensajes, setMensajes] = useState([])
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const finRef = useRef(null)

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes, cargando])

  async function enviar(pregunta) {
    const q = (pregunta ?? texto).trim()
    if (!q || cargando) return
    setTexto('')
    setMensajes(m => [...m, { role: 'user', content: q }])
    setCargando(true)
    try {
      const { data } = await api.post('/chatbot/preguntar', { pregunta: q })
      setMensajes(m => [...m, { role: 'assistant', content: data.respuesta || '(sin respuesta)', sql: data.sql }])
    } catch (err) {
      setMensajes(m => [...m, { role: 'assistant', content: '', error: err.response?.data?.error || 'Error al consultar el asistente' }])
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="mb-3">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Sparkles size={22} className="text-green-600" /> Asistente de reportes
        </h2>
        <p className="text-gray-500 text-sm mt-0.5">Preguntá en lenguaje natural sobre citas, ingresos, pacientes, servicios…</p>
      </div>

      {/* Conversación */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-4">
        {mensajes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
              <Bot size={28} className="text-green-600" />
            </div>
            <p className="text-gray-500 text-sm max-w-sm">Hacé una pregunta sobre los datos de la clínica. Por ejemplo:</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGERENCIAS.map(s => (
                <button key={s} onClick={() => enviar(s)}
                  className="text-xs bg-white border border-gray-200 hover:border-green-400 hover:bg-green-50 text-gray-600 px-3 py-1.5 rounded-full transition">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          mensajes.map((m, i) => <Burbuja key={i} msg={m} />)
        )}
        {cargando && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0"><Bot size={16} /></div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={finRef} />
      </div>

      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); enviar() }} className="mt-3 flex items-center gap-2">
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Escribí tu pregunta…"
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button type="submit" disabled={cargando || !texto.trim()}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-5 py-3 rounded-xl font-semibold text-sm transition">
          <Send size={16} /> Enviar
        </button>
      </form>
      <p className="text-[11px] text-gray-400 mt-1.5 text-center">El asistente consulta la base solo en modo lectura. Verificá cifras importantes antes de decidir.</p>
    </div>
  )
}
