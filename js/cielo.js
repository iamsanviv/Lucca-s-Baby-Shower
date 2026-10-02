// Estrellas titilantes del fondo (solo decoración).
(function () {
  const cielo = document.getElementById("cielo");
  if (!cielo) return;
  const cantidad = window.innerWidth < 600 ? 45 : 90;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < cantidad; i++) {
    const e = document.createElement("span");
    e.className = "estrella" + (Math.random() < 0.15 ? " grande" : "");
    e.style.left = (Math.random() * 100).toFixed(2) + "%";
    e.style.top = (Math.random() * 100).toFixed(2) + "%";
    e.style.animationDuration = (2.2 + Math.random() * 3).toFixed(2) + "s";
    e.style.animationDelay = (-Math.random() * 5).toFixed(2) + "s";
    frag.appendChild(e);
  }
  cielo.appendChild(frag);
})();
