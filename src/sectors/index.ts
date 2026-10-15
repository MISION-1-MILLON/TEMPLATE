import type { SectorConfig } from "./types";

const baseTerms = {
  product: "Producto",
  products: "Productos",
  customer: "Cliente",
  customers: "Clientes",
  store: "Tienda",
};

export const general: SectorConfig = {
  id: "general",
  name: "Cualquier negocio",
  tagline: "La base completa, sin campos específicos. Personalízala a tu medida.",
  accent: "#4f46e5",
  terms: baseTerms,
  productFields: [
    { key: "marca", label: "Marca", type: "text", showInList: true },
    { key: "proveedor", label: "Proveedor", type: "text" },
  ],
  customerFields: [],
  defaultCategories: ["General"],
  trackStockByDefault: true,
  postTemplates: [
    "✨ Nuevo en {negocio}: {nombre}\n\nPor solo {precio}. Pásate a verlo o escríbenos por privado.",
    "{nombre} ya disponible 🙌\n\n{precio} · Unidades limitadas.",
  ],
  hashtags: ["#novedad", "#comerciolocal", "#shoplocal"],
  demoProducts: [
    { name: "Producto de ejemplo A", category: "General", price: 19.9, cost: 8, stock: 12, attributes: { marca: "Marca X" } },
    { name: "Producto de ejemplo B", category: "General", price: 49, cost: 22, stock: 3, attributes: { marca: "Marca Y" } },
  ],
};

export const zapatillas: SectorConfig = {
  id: "zapatillas",
  name: "Zapatillas y sneakers",
  tagline: "Stock por talla, colorways, ediciones limitadas y precio de reventa.",
  accent: "#ea580c",
  terms: { ...baseTerms, product: "Zapatilla", products: "Zapatillas", productFeminine: true },
  productFields: [
    { key: "marca", label: "Marca", type: "select", options: ["Nike", "Jordan", "Adidas", "New Balance", "Asics", "Puma", "Vans", "Otra"], showInList: true },
    { key: "modelo", label: "Modelo", type: "text", placeholder: "Air Max 90" },
    { key: "colorway", label: "Colorway", type: "text", placeholder: "Infrared", showInList: true },
    { key: "talla", label: "Talla (EU)", type: "select", options: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47"], showInList: true },
    { key: "estado", label: "Estado", type: "select", options: ["Nuevo (DS)", "Nuevo sin caja", "Usado - como nuevo", "Usado"] },
    { key: "edicion_limitada", label: "Edición limitada", type: "boolean" },
    { key: "precio_reventa", label: "Precio de reventa de referencia", type: "number", suffix: "€" },
  ],
  customerFields: [{ key: "talla_habitual", label: "Talla habitual", type: "text" }],
  defaultCategories: ["Running", "Lifestyle", "Basket", "Skate", "Ediciones limitadas"],
  trackStockByDefault: true,
  postTemplates: [
    "🔥 DROP: {marca} {nombre}\nColorway: {colorway}\nTalla {talla} · {estado}\n\n💸 {precio}\n📩 Reserva por DM",
    "Solo queda una 👟 {nombre} en talla {talla}.\n{precio}. El primero que escriba se la lleva.",
  ],
  hashtags: ["#sneakers", "#sneakerhead", "#kicks", "#zapatillas"],
  demoProducts: [
    { name: "Air Max 90", category: "Lifestyle", price: 149.99, cost: 85, stock: 4, attributes: { marca: "Nike", colorway: "Infrared", talla: "42", estado: "Nuevo (DS)" } },
    { name: "Samba OG", category: "Lifestyle", price: 120, cost: 62, stock: 7, attributes: { marca: "Adidas", colorway: "White/Black", talla: "41", estado: "Nuevo (DS)" } },
    { name: "Jordan 1 High 'Chicago'", category: "Ediciones limitadas", price: 420, cost: 280, stock: 1, attributes: { marca: "Jordan", colorway: "Chicago", talla: "43", estado: "Nuevo (DS)", edicion_limitada: true, precio_reventa: 450 } },
    { name: "Gel-Kayano 14", category: "Running", price: 160, cost: 90, stock: 2, attributes: { marca: "Asics", colorway: "Cream/Silver", talla: "44", estado: "Nuevo (DS)" } },
  ],
};

export const moda: SectorConfig = {
  id: "moda",
  name: "Ropa y moda",
  tagline: "Tallas, colores, temporadas y colecciones en un mismo catálogo.",
  accent: "#db2777",
  terms: { ...baseTerms, product: "Prenda", products: "Prendas", productFeminine: true },
  productFields: [
    { key: "talla", label: "Talla", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL", "Única"], showInList: true },
    { key: "color", label: "Color", type: "text", showInList: true },
    { key: "material", label: "Material", type: "text", placeholder: "100% algodón" },
    { key: "temporada", label: "Temporada", type: "select", options: ["Primavera-Verano", "Otoño-Invierno", "Todo el año"] },
    { key: "genero", label: "Género", type: "select", options: ["Mujer", "Hombre", "Unisex", "Infantil"] },
  ],
  customerFields: [{ key: "talla_habitual", label: "Talla habitual", type: "text" }],
  defaultCategories: ["Camisetas", "Pantalones", "Vestidos", "Abrigos", "Accesorios"],
  trackStockByDefault: true,
  postTemplates: [
    "Nueva colección {temporada} ✨\n{nombre} en {color}\nTallas disponibles · {precio}\n\nVen a probártelo o pídelo por DM 🛍️",
    "Look del día: {nombre} ({material}) 🤍\n{precio}",
  ],
  hashtags: ["#moda", "#outfit", "#nuevacoleccion", "#tiendademoda"],
  demoProducts: [
    { name: "Camiseta básica oversize", category: "Camisetas", price: 24.95, cost: 7, stock: 30, attributes: { talla: "M", color: "Blanco", material: "100% algodón", temporada: "Todo el año", genero: "Unisex" } },
    { name: "Vaquero recto", category: "Pantalones", price: 59.9, cost: 21, stock: 12, attributes: { talla: "L", color: "Azul medio", material: "Denim", temporada: "Todo el año", genero: "Mujer" } },
    { name: "Abrigo de paño", category: "Abrigos", price: 139, cost: 55, stock: 2, attributes: { talla: "S", color: "Camel", material: "Lana", temporada: "Otoño-Invierno", genero: "Mujer" } },
  ],
};

export const restauracion: SectorConfig = {
  id: "restauracion",
  name: "Gastronomía y restauración",
  tagline: "Carta digital con alérgenos, escandallos y ventas por plato.",
  accent: "#16a34a",
  terms: { product: "Plato", products: "Platos", customer: "Cliente", customers: "Clientes", store: "Carta" },
  productFields: [
    { key: "alergenos", label: "Alérgenos", type: "multiselect", options: ["Gluten", "Crustáceos", "Huevo", "Pescado", "Cacahuete", "Soja", "Lácteos", "Frutos de cáscara", "Apio", "Mostaza", "Sésamo", "Sulfitos", "Altramuces", "Moluscos"], showInList: true },
    { key: "racion", label: "Formato", type: "select", options: ["Tapa", "Media ración", "Ración", "Plato", "Unidad", "Bebida"] },
    { key: "vegetariano", label: "Vegetariano", type: "boolean" },
    { key: "vegano", label: "Vegano", type: "boolean" },
    { key: "picante", label: "Picante", type: "boolean" },
  ],
  customerFields: [{ key: "alergias", label: "Alergias / preferencias", type: "text" }],
  defaultCategories: ["Entrantes", "Principales", "Postres", "Bebidas"],
  trackStockByDefault: false,
  postTemplates: [
    "Hoy en {negocio} 🍽️\n{nombre} · {racion}\n{precio}\n\n📍 Te esperamos. Reserva por DM o llamando.",
    "¿Ya has probado nuestro {nombre}? 😋\nSolo {precio}.",
  ],
  hashtags: ["#gastronomia", "#foodie", "#restaurante", "#comerbien"],
  demoProducts: [
    { name: "Croquetas de jamón (6 uds)", category: "Entrantes", price: 9.5, cost: 2.4, stock: 0, attributes: { alergenos: ["Gluten", "Lácteos", "Huevo"], racion: "Ración" } },
    { name: "Patatas bravas", category: "Entrantes", price: 6.5, cost: 1.1, stock: 0, attributes: { alergenos: ["Huevo"], racion: "Ración", vegetariano: true, picante: true } },
    { name: "Arroz meloso de setas", category: "Principales", price: 16, cost: 4.2, stock: 0, attributes: { alergenos: ["Lácteos", "Apio"], racion: "Plato", vegetariano: true } },
    { name: "Tarta de queso", category: "Postres", price: 6, cost: 1.5, stock: 0, attributes: { alergenos: ["Lácteos", "Huevo", "Gluten"], racion: "Unidad", vegetariano: true } },
    { name: "Caña", category: "Bebidas", price: 2.5, cost: 0.6, stock: 0, attributes: { alergenos: ["Gluten"], racion: "Bebida" } },
  ],
};

export const motor: SectorConfig = {
  id: "motor",
  name: "Motor y vehículos",
  tagline: "Stock de vehículos con kilometraje, año, combustible y matrícula.",
  accent: "#dc2626",
  terms: { ...baseTerms, product: "Vehículo", products: "Vehículos", store: "Escaparate" },
  productFields: [
    { key: "marca", label: "Marca", type: "text", showInList: true },
    { key: "modelo", label: "Modelo", type: "text" },
    { key: "anio", label: "Año", type: "number", showInList: true },
    { key: "km", label: "Kilómetros", type: "number", suffix: "km", showInList: true },
    { key: "combustible", label: "Combustible", type: "select", options: ["Gasolina", "Diésel", "Híbrido", "Híbrido enchufable", "Eléctrico", "GLP"] },
    { key: "cambio", label: "Cambio", type: "select", options: ["Manual", "Automático"] },
    { key: "matricula", label: "Matrícula", type: "text" },
  ],
  customerFields: [{ key: "vehiculo_interes", label: "Vehículo de interés", type: "text" }],
  defaultCategories: ["Turismos", "SUV", "Furgonetas", "Motos"],
  trackStockByDefault: true,
  postTemplates: [
    "🚗 {marca} {nombre} ({anio})\n{km} km · {combustible} · {cambio}\n\n💶 {precio}\nFinanciación a tu medida. Escríbenos.",
  ],
  hashtags: ["#cochesdeocasion", "#vehiculos", "#concesionario"],
  demoProducts: [
    { name: "Golf 1.5 TSI Life", category: "Turismos", price: 21900, cost: 18500, stock: 1, attributes: { marca: "Volkswagen", anio: 2021, km: 48000, combustible: "Gasolina", cambio: "Manual" } },
    { name: "Tucson 1.6 HEV", category: "SUV", price: 29500, cost: 25200, stock: 1, attributes: { marca: "Hyundai", anio: 2022, km: 31000, combustible: "Híbrido", cambio: "Automático" } },
  ],
};

export const SECTORS: Record<string, SectorConfig> = {
  general,
  zapatillas,
  moda,
  restauracion,
  motor,
};

export const SECTOR_LIST = Object.values(SECTORS);

export function getSector(id: string | null | undefined): SectorConfig {
  return (id && SECTORS[id]) || general;
}

export type { SectorConfig, SectorField } from "./types";

/** "Nuevo producto" / "Nueva zapatilla" */
export function newProductLabel(terms: SectorConfig["terms"]) {
  return `${terms.productFeminine ? "Nueva" : "Nuevo"} ${terms.product.toLowerCase()}`;
}
