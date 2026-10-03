// Capa de datos: Supabase si hay configuración, si no "modo demo" local.
(function () {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.CONFIG || {};
  const DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;
  const DEMO_KEY = "lucca_demo_db";

  const MENSAJES = {
    AGOTADO: "Alguien acaba de elegir este regalo. ¡Elige otro, por favor!",
    NOMBRE_INVALIDO: "Escribe tu nombre (entre 2 y 60 letras).",
    NO_EXISTE: "Ese regalo no existe.",
    CLAVE_INCORRECTA: "Clave incorrecta.",
  };

  function traducirError(texto) {
    for (const codigo in MENSAJES) {
      if (texto && texto.includes(codigo)) return new Error(MENSAJES[codigo]);
    }
    return new Error("No pudimos conectarnos. Intenta de nuevo en un momento.");
  }

  async function rpc(nombre, args) {
    let res;
    try {
      res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nombre}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args || {}),
      });
    } catch (e) {
      throw traducirError("");
    }
    const texto = await res.text();
    if (!res.ok) throw traducirError(texto);
    return texto ? JSON.parse(texto) : null;
  }

  // ---------- modo demo (solo este navegador) ----------
  function demoLeer() {
    try {
      return JSON.parse(localStorage.getItem(DEMO_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function demoGuardar(lista) {
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(lista));
    } catch (e) {}
  }
  function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
  }

  const demo = {
    async estado() {
      const lista = demoLeer();
      return window.REGALOS.map((r) => ({
        gift_id: r.id,
        max_qty: r.max,
        taken: lista.filter((x) => x.gift_id === r.id).length,
      }));
    },
    async reservar(giftId, nombre, nota) {
      const n = (nombre || "").trim();
      if (n.length < 2 || n.length > 60) throw new Error(MENSAJES.NOMBRE_INVALIDO);
      const lista = demoLeer();
      const fila = {
        id: uuid(), token: uuid(), gift_id: giftId, guest_name: n,
        nota: (nota || "").trim().slice(0, 200) || null,
        created_at: new Date().toISOString(),
      };
      lista.push(fila);
      demoGuardar(lista);
      return { reservation_id: fila.id, token: fila.token };
    },
    async cancelar(id, token) {
      const lista = demoLeer();
      const nueva = lista.filter((x) => !(x.id === id && x.token === token));
      demoGuardar(nueva);
      return nueva.length !== lista.length;
    },
    async adminLista() {
      return demoLeer().map((x) => ({
        ...x,
        gift_nombre: window.REGALOS.find((r) => r.id === x.gift_id).nombre,
      }));
    },
    async adminLiberar(_clave, id) {
      demoGuardar(demoLeer().filter((x) => x.id !== id));
      return true;
    },
  };

  const remoto = {
    estado: () => rpc("gift_status"),
    async reservar(giftId, nombre, nota) {
      const args = { p_gift_id: giftId, p_name: nombre };
      const n = (nota || "").trim();
      if (n) args.p_nota = n;  // solo se envía cuando hay nota (regalo personalizado)
      const filas = await rpc("reserve_gift", args);
      return filas[0];
    },
    cancelar: (id, token) => rpc("cancel_reservation", { p_id: id, p_token: token }),
    adminLista: (clave) => rpc("admin_list", { p_key: clave }),
    adminLiberar: (clave, id) => rpc("admin_release", { p_key: clave, p_id: id }),
  };

  window.API = Object.assign({ DEMO }, DEMO ? demo : remoto);
})();
