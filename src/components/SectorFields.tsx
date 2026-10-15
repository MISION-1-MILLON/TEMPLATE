import type { SectorField } from "@/sectors";
import type { Attributes } from "@/lib/attributes";

/** Pinta los campos propios del sector. Sirve para productos y clientes. */
export function SectorFields({ fields, values = {} }: { fields: SectorField[]; values?: Attributes }) {
  if (fields.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const name = `attr.${f.key}`;
        const id = `attr-${f.key}`;
        const v = values[f.key];
        if (f.type === "boolean") {
          return (
            <label key={f.key} className="flex items-center gap-2 self-end py-2 text-sm font-medium text-slate-700">
              <input type="checkbox" name={name} defaultChecked={v === true} className="h-4 w-4 rounded border-slate-300" />
              {f.label}
            </label>
          );
        }
        if (f.type === "multiselect") {
          const selected = Array.isArray(v) ? v : [];
          return (
            <fieldset key={f.key} className="sm:col-span-2">
              <legend className="label">{f.label}</legend>
              <div className="flex flex-wrap gap-2">
                {f.options?.map((o) => (
                  <label key={o} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                    <input type="checkbox" name={name} value={o} defaultChecked={selected.includes(o)} className="h-3.5 w-3.5" />
                    {o}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        }
        return (
          <div key={f.key}>
            <label className="label" htmlFor={id}>{f.label}{f.suffix ? ` (${f.suffix})` : ""}</label>
            {f.type === "select" ? (
              <select className="input" id={id} name={name} defaultValue={v != null ? String(v) : ""}>
                <option value="">—</option>
                {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                className="input"
                id={id}
                name={name}
                type={f.type === "number" ? "number" : "text"}
                step="any"
                placeholder={f.placeholder}
                defaultValue={v != null ? String(v) : ""}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
