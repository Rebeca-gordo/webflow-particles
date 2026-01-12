/* =========================================================
   Particles Background – Three.js
   External JS for Webflow (GitHub + jsDelivr)
   ========================================================= */

(function () {

  function run() {

    // 🔴 SI EL CANVAS NO EXISTE, NO HACEMOS NADA
    const canvas = document.getElementById("bg");
    if (!canvas) {
      console.warn("Canvas #bg no encontrado");
      return;
    }

    // 🔴 SI THREE NO ESTÁ CARGADO, ESPERAMOS
    if (typeof THREE === "undefined") {
      console.warn("Three.js no cargado todavía, reintentando…");
      setTimeout(run, 100);
      return;
    }

    /* =====================================================
       🔽🔽🔽 PEGA AQUÍ TODO TU CÓDIGO ORIGINAL 🔽🔽🔽
       (TODO lo que estaba dentro de <script>...</script>)
       SIN volver a envolver en DOMContentLoaded
       ===================================================== */

    // ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇
    // PEGA AQUÍ TU CÓDIGO TAL CUAL
    // scene, camera, params, init(), animate(), etc.
    // ⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆

    /* =====================================================
       🔼🔼🔼 FIN DE TU CÓDIGO ORIGINAL 🔼🔼🔼
       ===================================================== */
  }

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }

})();
