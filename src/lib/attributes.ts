import type { SectorField } from "@/sectors";

export type Attributes = Record<string, string | number | boolean | string[]>;

/** Lee del formulario los campos del sector (inputs con name="attr.<key>") */
export function readAttributes(form: FormData, fields: SectorField[]): Attributes {
  const out: Attributes = {};
  for (const f of fields) {
    const name = `attr.${f.key}`;
    if (f.type === "boolean") {
      if (form.get(name) === "on") out[f.key] = true;
    } else if (f.type === "multiselect") {
      const values = form.getAll(name).map(String).filter(Boolean);
      if (values.length) out[f.key] = values;
    } else if (f.type === "number") {
      const raw = String(form.get(name) ?? "").replace(",", ".").trim();
      if (raw !== "" && Number.isFinite(Number(raw))) out[f.key] = Number(raw);
    } else {
      const v = String(form.get(name) ?? "").trim();
      if (v) out[f.key] = v;
    }
  }
  return out;
}

export function asAttributes(json: unknown): Attributes {
  return json && typeof json === "object" && !Array.isArray(json) ? (json as Attributes) : {};
}

export function formatAttribute(field: SectorField, value: unknown): string {
  if (value == null || value === "") return "";
  if (field.type === "boolean") return value ? "Sí" : "";
  if (Array.isArray(value)) return value.join(", ");
  if (field.type === "number") return `${Number(value).toLocaleString("es-ES")}${field.suffix ? ` ${field.suffix}` : ""}`;
  return String(value);
}
