/**
 * Un sector es una "capa de personalización" encima del núcleo común.
 * El núcleo (productos, clientes, ventas, caja) es igual para todos;
 * el sector solo cambia vocabulario, campos extra, categorías iniciales
 * y plantillas de publicación.
 */

export type FieldType = "text" | "number" | "select" | "multiselect" | "boolean";

export interface SectorField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  /** Unidad que se muestra junto al valor (km, cm, g…) */
  suffix?: string;
  /** Mostrar como columna en el listado de productos */
  showInList?: boolean;
}

export interface SectorTerms {
  /** "Producto", "Plato", "Vehículo"… */
  product: string;
  products: string;
  /** Género gramatical de `product` para concordar ("Nueva prenda" / "Nuevo plato") */
  productFeminine?: boolean;
  customer: string;
  customers: string;
  /** Nombre de la tienda pública: "Tienda", "Carta", "Escaparate"… */
  store: string;
}

export interface SectorConfig {
  id: string;
  name: string;
  /** Frase corta para la landing y el onboarding */
  tagline: string;
  /** Color de acento (hex) para tarjetas de sector */
  accent: string;
  terms: SectorTerms;
  productFields: SectorField[];
  customerFields: SectorField[];
  defaultCategories: string[];
  /** ¿Tiene sentido controlar stock por defecto? (en un restaurante, no) */
  trackStockByDefault: boolean;
  /** Plantilla para el módulo Publica. Variables: {nombre} {precio} {negocio} y cualquier campo del sector */
  postTemplates: string[];
  hashtags: string[];
  /** Productos de ejemplo para la demo */
  demoProducts: Array<{
    name: string;
    category: string;
    price: number;
    cost: number;
    stock: number;
    attributes: Record<string, unknown>;
  }>;
}
