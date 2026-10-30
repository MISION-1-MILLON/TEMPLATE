/** Mientras carga una pantalla del panel: la forma de lo que viene, sin spinners */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton mt-2 h-4 w-72" />
      <div className="card mt-6 grid grid-cols-2 gap-px overflow-hidden sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="px-5 py-4"><div className="skeleton h-3.5 w-20" /><div className="skeleton mt-3 h-6 w-28" /></div>
        ))}
      </div>
      <div className="card mt-6 divide-y divide-slate-100">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5"><div className="skeleton h-4 flex-1" /><div className="skeleton h-4 w-16" /></div>
        ))}
      </div>
    </div>
  );
}
