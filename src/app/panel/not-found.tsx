import Link from "next/link";

/** Una sección que no existe o que este perfil no puede abrir: no se dice cuál de las dos */
export default function PanelNotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-md px-6 py-12 text-center">
      <p className="num text-sm text-slate-400">404</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">Esta sección no está disponible</h1>
      <p className="mt-2 text-sm text-slate-500">No existe, está apagada en tu negocio o tu perfil no tiene acceso. Si crees que deberías verla, pídeselo al dueño.</p>
      <Link href="/panel" className="btn-primary mt-6">Volver al inicio</Link>
    </div>
  );
}
