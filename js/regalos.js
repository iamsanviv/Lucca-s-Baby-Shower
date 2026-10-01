// Lista de regalos. `max` = cuántas personas pueden regalarlo.
// max: null  -> se puede repetir sin límite
// max: 1     -> regalo único (al elegirlo desaparece para los demás)
// Si cambias un `max` aquí, cámbialo también en supabase/schema.sql (tabla gifts).
window.REGALOS = [
  { id: 1,  nombre: "Pañales y pañitos húmedos",  detalle: "Cualquier etapa",           max: null },
  { id: 2,  nombre: "Set de teteros Avent Natural", detalle: "",                         max: 1 },
  { id: 3,  nombre: "Bodys blancos",              detalle: "Cualquier talla",           max: null },
  { id: 4,  nombre: "Toalla bebé",                detalle: "",                          max: 2 },
  { id: 5,  nombre: "Cobijas bebé",               detalle: "",                          max: 3 },
  { id: 6,  nombre: "Pantalones",                 detalle: "0-1 mes o 1-3 meses",       max: null },
  { id: 7,  nombre: "Medias",                     detalle: "",                          max: null },
  { id: 8,  nombre: "Carro organizador",          detalle: "",                          max: 1 },
  { id: 9,  nombre: "Bañera con patas",           detalle: "",                          max: 1 },
  { id: 10, nombre: "Cojín de lactancia",         detalle: "",                          max: 1 },
  { id: 11, nombre: "Fular",                      detalle: "",                          max: 1 },
  { id: 12, nombre: "Sonido blanco",              detalle: "",                          max: 1 },
  { id: 13, nombre: "Nido colecho",               detalle: "",                          max: 1 },
  { id: 14, nombre: "Kit de aseo",                detalle: "",                          max: 1 },
  { id: 15, nombre: "Baby gym",                   detalle: "",                          max: 1 },
  { id: 16, nombre: "Silla mecedora",             detalle: "",                          max: 1 },
  { id: 17, nombre: "Aspirador nasal",            detalle: "",                          max: 1 },
  { id: 18, nombre: "Monitor y cámara",           detalle: "",                          max: 1 },
  { id: 19, nombre: "Calentador de pañitos",      detalle: "",                          max: 1 },
  { id: 20, nombre: "Esterilizador de biberones", detalle: "",                          max: 1 },
];
