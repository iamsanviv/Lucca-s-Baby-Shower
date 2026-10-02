(function () {
  const CLAVE_NOMBRE = "lucca_nombre";
  const CLAVE_MIOS = "lucca_mis_regalos";
  const INTERVALO_MS = 15000;

  const $ = (sel) => document.querySelector(sel);
  const lista = $("#lista");
  const dialogo = $("#dialogo");
  const form = $("#form-reserva");
  const inputNombre = $("#dlg-nombre");
  const errorDlg = $("#dlg-error");
  const btnOk = $("#dlg-ok");

  let estado = {};          // gift_id -> { max_qty, taken }
  let filtro = "todos";
  let regaloActual = null;

  // ---------- almacenamiento local (tolerante a navegadores privados) ----------
  function leer(clave, porDefecto) {
    try {
      const v = localStorage.getItem(clave);
      return v === null ? porDefecto : JSON.parse(v);
    } catch (e) {
      return porDefecto;
    }
  }
  function guardar(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) {}
  }

  let nombre = leer(CLAVE_NOMBRE, "");
  let mios = leer(CLAVE_MIOS, []);   // [{ id, token, gift_id }]

  // Enlace personalizado: ?invitado=Tia%20Maria
  const param = new URLSearchParams(location.search).get("invitado");
  if (param && param.trim()) {
    nombre = param.trim().slice(0, 60);
    guardar(CLAVE_NOMBRE, nombre);
  }

  // ---------- utilidades ----------
  function imagen(id) {
    return `img/regalos/${String(id).padStart(2, "0")}.jpg`;
  }

  function escapar(t) {
    const d = document.createElement("div");
    d.textContent = t;
    return d.innerHTML;
  }

  let toastTimer;
  function aviso(texto) {
    const t = $("#toast");
    t.textContent = texto;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 3800);
  }

  function misReservas(giftId) {
    return mios.filter((m) => m.gift_id === giftId);
  }

  function pintarSaludo() {
    const s = $("#saludo");
    if (nombre) {
      s.innerHTML = `¡Hola, ${escapar(nombre)}! 💙 <button type="button" id="cambiar-nombre">(no soy yo)</button>`;
      $("#cambiar-nombre").onclick = () => {
        nombre = "";
        guardar(CLAVE_NOMBRE, "");
        pintarSaludo();
      };
    } else {
      s.textContent = "";
    }
  }

  // ---------- render ----------
  function infoRegalo(r) {
    const e = estado[r.id] || { max_qty: r.max, taken: 0 };
    const max = e.max_qty;
    const tomados = e.taken;
    const propios = misReservas(r.id).length;
    const disponible = max === null || tomados < max;
    return { max, tomados, propios, disponible };
  }

  function etiqueta(r, i) {
    if (i.max === null) {
      if (i.tomados === 0) return "Me sirven muchos";
      return `Me sirven muchos · ${i.tomados === 1 ? "ya me lo regala 1 persona" : `ya me lo regalan ${i.tomados}`}`;
    }
    if (i.max === 1) return "Regalo único";
    const quedan = Math.max(i.max - i.tomados, 0);
    return quedan === 0 ? `Ya tengo los ${i.max} que necesito` : `Necesito ${i.max} · faltan ${quedan}`;
  }

  function tipo(i) {
    return i.max === null ? "varios" : i.max === 1 ? "unico" : "cupo";
  }

  function render() {
    const items = window.REGALOS.filter((r) => {
      const i = infoRegalo(r);
      if (filtro === "disponibles") return i.disponible;
      if (filtro === "mios") return i.propios > 0;
      return true;
    });

    if (!items.length) {
      lista.innerHTML = `<li class="vacio">${
        filtro === "mios" ? "Aún no has elegido nada para mí." : "¡Ya me regalaron todo! Gracias 💙"
      }</li>`;
      return;
    }

    lista.innerHTML = items
      .map((r, idx) => {
        const i = infoRegalo(r);
        const clases = ["regalo"];
        let accion;
        if (i.propios > 0) {
          clases.push("mio");
          accion = `<span class="sello">✓ Tú me lo regalas${i.propios > 1 ? ` (×${i.propios})` : ""}</span>
                    ${i.disponible && i.max !== 1 ? `<button type="button" class="btn-link" data-reservar="${r.id}">Regalarme otro</button>` : ""}
                    <button type="button" class="btn-link" data-cancelar="${r.id}">Cancelar</button>`;
        } else if (!i.disponible) {
          clases.push("agotado");
          accion = `<span class="sello">Alguien ya me lo regala 💙</span>`;
        } else {
          accion = `<button type="button" class="btn" data-reservar="${r.id}">Te lo regalo</button>`;
        }
        return `
          <li class="${clases.join(" ")}" style="--i:${idx}">
            <span class="numero">${r.id}</span>
            <div class="foto"><img src="${imagen(r.id)}" alt="${escapar(r.nombre)}" width="270" height="250"></div>
            <h3>${escapar(r.nombre)}</h3>
            ${r.detalle ? `<p class="detalle">${escapar(r.detalle)}</p>` : ""}
            <p class="etiqueta ${tipo(i)}">${etiqueta(r, i)}</p>
            ${accion}
          </li>`;
      })
      .join("");
  }

  async function cargar() {
    try {
      const filas = await window.API.estado();
      estado = {};
      filas.forEach((f) => (estado[f.gift_id] = { max_qty: f.max_qty, taken: f.taken }));
      $("#cargando").hidden = true;
      render();
      if (!lista.dataset.listo) {
        lista.dataset.listo = "1";
        lista.classList.add("entrada");
        setTimeout(() => lista.classList.remove("entrada"), 2000);
      }
    } catch (e) {
      $("#cargando").textContent = e.message;
    }
  }

  // ---------- reservar ----------
  function abrirDialogo(giftId) {
    regaloActual = window.REGALOS.find((r) => r.id === giftId);
    $("#dlg-img").src = imagen(giftId);
    $("#dlg-titulo").textContent = regaloActual.nombre;
    $("#dlg-sub").textContent = regaloActual.max === 1
      ? "Así nadie más lo elegirá y no me llegará repetido."
      : "Así sabré que tú me lo traes.";
    inputNombre.value = nombre;
    errorDlg.textContent = "";
    btnOk.disabled = false;
    btnOk.textContent = "¡Sí, te lo regalo!";
    dialogo.showModal();
    if (!nombre) inputNombre.focus();
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const n = inputNombre.value.trim();
    if (n.length < 2) {
      errorDlg.textContent = "Escribe tu nombre para saber quién me lo regala.";
      return;
    }
    btnOk.disabled = true;
    btnOk.textContent = "Guardando…";
    try {
      const res = await window.API.reservar(regaloActual.id, n);
      nombre = n;
      guardar(CLAVE_NOMBRE, nombre);
      mios.push({ id: res.reservation_id, token: res.token, gift_id: regaloActual.id });
      guardar(CLAVE_MIOS, mios);
      dialogo.close();
      pintarSaludo();
      aviso(`¡Gracias, ${nombre}! Me encantará: ${regaloActual.nombre} 💙`);
      await cargar();
    } catch (e) {
      errorDlg.textContent = e.message;
      btnOk.disabled = false;
      btnOk.textContent = "¡Sí, te lo regalo!";
      cargar();
    }
  });

  $("#dlg-cancelar").addEventListener("click", () => dialogo.close());

  // ---------- cancelar ----------
  async function cancelar(giftId) {
    const regalo = window.REGALOS.find((r) => r.id === giftId);
    const propia = misReservas(giftId).pop();
    if (!propia) return;
    if (!confirm(`¿Ya no me regalarás "${regalo.nombre}"?`)) return;
    try {
      await window.API.cancelar(propia.id, propia.token);
      mios = mios.filter((m) => m.id !== propia.id);
      guardar(CLAVE_MIOS, mios);
      aviso("Listo, lo quité de tu lista.");
      await cargar();
    } catch (e) {
      aviso(e.message);
    }
  }

  // ---------- eventos ----------
  lista.addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    if (b.dataset.reservar) abrirDialogo(Number(b.dataset.reservar));
    if (b.dataset.cancelar) cancelar(Number(b.dataset.cancelar));
  });

  document.querySelectorAll(".filtro").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".filtro").forEach((x) => x.classList.remove("activo"));
      b.classList.add("activo");
      filtro = b.dataset.filtro;
      render();
    })
  );

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) cargar();
  });
  setInterval(() => {
    if (!document.hidden && !dialogo.open) cargar();
  }, INTERVALO_MS);

  if (window.API.DEMO) $("#aviso-demo").hidden = false;
  pintarSaludo();
  cargar();
})();
