console.log("particles.js loaded ✅");

(function () {
  function boot() {
    const canvasEl = document.getElementById("bg");
    if (!canvasEl) {
      console.warn("No canvas #bg");
      return;
    }

    if (typeof THREE === "undefined") {
      console.warn("THREE aún no cargó, reintentando…");
      setTimeout(boot, 100);
      return;
    }

    console.log("Boot ok ✅ canvas + THREE");

    // ================== TU CÓDIGO ORIGINAL (SIN DOMContentLoaded) ==================

    // Globals
    let scene, camera, renderer;
    let particleSystem;
    let coreSystem;
    let corePositionsArr, coreVelArr;
    let coreCount = 0;
    let params = {
      particleCount: 32000,
      radius: 200,
      baseSize: 1.2,
      sizeAttenuation: true,
      cameraRadius: 240,
      cameraZoom: 1.2,
      cursorAttractionBase: 0.28,
      cursorDecayTime: 2400,
      cursorMinStrength: 0.12,
      cursorLerp: 0.06,
      cursorInfluenceFactor: 0.42,
      cursorScreenRadius: 0.18,
      swirlStrength: 0.22,
      noiseStrength: 0.00045,
      velocityDamping: 0.985,
      attractStrengthMin: 0.75,
      attractStrengthMax: 1.45,
      orbitScaleMin: 0.6,
      orbitScaleMax: 1.4,
      attractRadiusFactor: 0.28,
      distantAttractScale: 0.06,
      distantAttractFalloff: 1.8,
      releaseStrength: 0.04,
      releaseDuration: 1000,
      releaseMax: 0.12,
      boundaryForce: 0.018,
      boundaryMargin: 0.08,
      cameraHeight: 180,
      minCameraDistanceFactor: 0.95,
      clusterCount: 18,
      clusterFraction: 0.12,
      coreCount: 10200,
      clusterRadiusFactor: 0.16,
      quality: "auto",
      idleHeavySkipFrames: 6,
      maxParticleCount: 36000,
      minParticleScale: 0.18,
      startupGraceMs: 800,
      settleDuration: 1200,
      initialVelocityScale: 0.36,
      startupDamping: 0.94,
      initialSpawnRadiusFraction: 1.30,
      velocityScalarScale: 0.18,
      radialDriftScale: 0.00006,
      coreRadialStabScale: 0.0,
      activeAttractOffset: 0.36,
      coreActiveAttractOffset: 0.22,
      releaseSpinImpulse: 0.004,
      releaseSpinDecay: 0.94,
      enableSceneRotation: false,
      headerMode: false,
      headerModeAutoEnableArea: 800 * 200,
      headerModeParticleCount: 1100,
      headerModeMaxParticleCount: 1200,
      headerModePixelRatio: 1,
      headerModeFrameInterval: 60,
      headerModeInitialVelocityScale: 0.22,
      headerModeStartupDamping: 0.90,
      headerModeSettleDuration: 2500,

      // OJO: si lo dejas en false puedes ver "casi nada"
      showBackgroundParticles: false,

      postReleaseActiveMs: 2200,
      activeFrameInterval: 16,
      idleFrameInterval: 16,
      hiddenFrameInterval: 200,
      starFraction: 0.20,
      armWeight: 0.35,
      armCount: 3,
      armTwist: 2.4,
      armSpread: 0.6,
      diskThickness: 0.12,
      radialFalloff: 0.7
    };

    let velocities;
    let velocitiesVec;
    let baseVelocitiesVec;
    let orbitPhases;
    let coreOrbitPhases;
    let baseCoreVel;
    let prevStartupFactor = 0;
    let mouse = { x: 0, y: 0 };

    let attractStrengths;
    let orbitScales;
    let coreAttractStrengths;
    let coreOrbitScales;

    let mouseNdc = new THREE.Vector2(0, 0);
    let lastClickTime = 0;
    let attractionActive = false;
    let cursor3D = new THREE.Vector3();
    let targetCursor = new THREE.Vector3();
    let raycaster, plane;

    let isInViewport = true;
    let lastRenderTime = 0;
    let cameraAngle = 0;
    let prevAttractionActive = false;

    let particleSystemEffectiveCount = 0;
    let frameCount = 0;

    let releaseStartTime = 0;
    let releaseOrigin = new THREE.Vector3();
    let appStartTime = 0;
    let sceneSpinVel = 0;

    function startApp() {
      appStartTime = performance.now();
      init();
      detectQuality();
      createParticles();
      animate();
    }

    function detectQuality() {
      const w = window.innerWidth,
        h = window.innerHeight;
      const area = w * h;
      const dpr = window.devicePixelRatio || 1;
      const isMobile =
        /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        Math.max(w, h) < 900;

      if (params.quality === "auto") {
        if (isMobile || dpr > 2 || area < 800 * 600) params.quality = "low";
        else if (dpr > 1.4 || area < 1280 * 720) params.quality = "medium";
        else params.quality = "high";
      }
      console.log("Quality:", params.quality, "dpr:", dpr, "area:", area);
    }

    // Aquí THREE ya existe (porque lo comprobamos arriba), así que arrancamos:
    startApp();

    function init() {
      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        3000
      );

      params.cameraRadius = Math.max(params.cameraRadius, params.radius * 1.2);
      if (params.cameraZoom && params.cameraZoom > 1) {
        params.cameraRadius *= params.cameraZoom;
      }
      camera.position.set(
        0,
        params.cameraHeight * (params.cameraZoom || 1),
        params.cameraRadius
      );

      const canvas = document.getElementById("bg");
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });

      const canvasRectInit = canvas.getBoundingClientRect();
      const canvasAreaInit = Math.max(1, canvasRectInit.width * canvasRectInit.height);
      const smallCanvasInit = canvasAreaInit < 800 * 200;

      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, smallCanvasInit ? 1 : 1.5)
      );
      renderer.setSize(window.innerWidth, window.innerHeight);

      try {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              isInViewport = entry.isIntersecting && entry.intersectionRatio > 0;
            });
          },
          { threshold: 0.01 }
        );
        io.observe(canvas);
      } catch (err) {
        isInViewport = true;
      }

      const headerRequested = canvas && canvas.dataset && canvas.dataset.headerMode === "true";
      const headerSmallCanvas = canvasAreaInit < params.headerModeAutoEnableArea;
      params.headerModeActive = !!(params.headerMode || headerRequested || headerSmallCanvas);

      if (params.headerModeActive) {
        renderer.setPixelRatio(
          Math.min(window.devicePixelRatio || 1, params.headerModePixelRatio)
        );
        params.maxParticleCount = Math.min(params.maxParticleCount, params.headerModeMaxParticleCount);
        params.initialVelocityScale = Math.min(params.initialVelocityScale, params.headerModeInitialVelocityScale);
        params.startupDamping = Math.min(params.startupDamping, params.headerModeStartupDamping);
        params.settleDuration = Math.max(params.settleDuration, params.headerModeSettleDuration);
        params.activeFrameInterval = Math.max(params.activeFrameInterval, params.headerModeFrameInterval);
        params.idleFrameInterval = Math.max(params.idleFrameInterval, params.headerModeFrameInterval);
        params.coreCount = Math.min(params.coreCount, Math.max(16, Math.round(params.headerModeParticleCount * 0.06)));
        params.baseSize *= 0.86;
        console.log("Header mode active — conserving CPU and particle count.");
      }

      if (typeof THREE.SRGBColorSpace !== "undefined") {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
      } else {
        renderer.outputEncoding = THREE.sRGBEncoding;
      }

      raycaster = new THREE.Raycaster();
      plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

      try {
        const gl = renderer.getContext();
        console.log("Three.js", THREE.REVISION ? "r" + THREE.REVISION : "(rev?)", "WebGL:", !!gl);
        if (!gl) console.warn("No WebGL context.");
      } catch (err) {
        console.warn("No se pudo acceder a WebGL context:", err);
      }

      window.addEventListener("resize", onWindowResize);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
      window.addEventListener(
        "touchmove",
        (e) => {
          if (e.touches && e.touches.length) {
            onMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
          }
        },
        { passive: true }
      );

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) console.log("Document hidden: throttling animation");
        else console.log("Document visible: resuming animation");
      });
    }

    function createParticles() {
      const canvasRect = renderer.domElement.getBoundingClientRect();
      const area = Math.max(1, canvasRect.width * canvasRect.height);
      const screenScale = Math.min(1, Math.max(params.minParticleScale, area / (1280 * 360)));

      let qualityFactor = 1.0;
      if (params.quality === "low") qualityFactor = 0.34;
      if (params.quality === "medium") qualityFactor = 0.60;
      if (params.quality === "high") qualityFactor = 1.0;

      let count = Math.max(256, Math.round(params.particleCount * screenScale * qualityFactor));
      count = Math.min(count, params.maxParticleCount);

      if (!params.showBackgroundParticles) {
        count = 0;
      }

      const radius = params.radius;
      const coreCountLocalUse = Math.max(32, Math.round(params.coreCount * screenScale * qualityFactor));

      const clusters = [];
      for (let i = 0; i < params.clusterCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2 * Math.PI;
        const phi = Math.acos(2 * v - 1);
        const r = Math.random() * 0.6 * radius * params.initialSpawnRadiusFraction;
        const cx = r * Math.sin(phi) * Math.cos(theta);
        const cy = r * Math.sin(phi) * Math.sin(theta);
        const cz = r * Math.cos(phi);
        clusters.push(new THREE.Vector3(cx, cy, cz));
      }

      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      velocities = new Float32Array(count);
      velocitiesVec = new Float32Array(count * 3);
      orbitPhases = new Float32Array(count);
      for (let ph = 0; ph < count; ph++) orbitPhases[ph] = Math.random() * Math.PI * 2.0;

      attractStrengths = new Float32Array(count);
      orbitScales = new Float32Array(count);

      particleSystemEffectiveCount = count;
      coreCount = coreCountLocalUse;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        const roll = Math.random();
        const starCutoff = params.clusterFraction;
        const isolatedCutoff = starCutoff + params.starFraction;

        if (roll < starCutoff) {
          const c = clusters[Math.floor(Math.random() * clusters.length)];
          const cr = Math.random() * params.clusterRadiusFactor * radius;
          const ang = Math.random() * Math.PI * 2;
          const pr = Math.pow(Math.random(), 0.5) * cr;
          const rx = Math.cos(ang) * pr;
          const rz = Math.sin(ang) * pr;
          const ry = (Math.random() - 0.5) * (params.diskThickness * cr);
          positions[i3] = c.x + rx;
          positions[i3 + 1] = c.y + ry;
          positions[i3 + 2] = c.z + rz;

          velocities[i] = (0.05 + Math.random() * 0.10) * params.velocityScalarScale;
          velocitiesVec[i3] = (positions[i3] - c.x) * 0.002 + (Math.random() - 0.5) * 0.02;
          velocitiesVec[i3 + 1] = (positions[i3 + 1] - c.y) * 0.002 + (Math.random() - 0.5) * 0.02;
          velocitiesVec[i3 + 2] = (positions[i3 + 2] - c.z) * 0.002 + (Math.random() - 0.5) * 0.02;

          attractStrengths[i] = params.attractStrengthMin + Math.random() * (params.attractStrengthMax - params.attractStrengthMin) * (0.95 + Math.random() * 0.15);
          orbitScales[i] = params.orbitScaleMin + Math.random() * (params.orbitScaleMax - params.orbitScaleMin) * (0.85 + Math.random() * 0.3);

        } else if (roll < isolatedCutoff) {
          const r = Math.pow(Math.random(), params.radialFalloff) * radius * params.initialSpawnRadiusFraction;
          const theta = Math.random() * 2 * Math.PI;
          const phi = Math.acos(2 * Math.random() - 1);
          positions[i3] = r * Math.sin(phi) * Math.cos(theta);
          positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
          positions[i3 + 2] = r * Math.cos(phi);

          velocities[i] = (0.01 + Math.random() * 0.06) * params.velocityScalarScale;
          velocitiesVec[i3] = (Math.random() - 0.5) * 0.04;
          velocitiesVec[i3 + 1] = (Math.random() - 0.5) * 0.03;
          velocitiesVec[i3 + 2] = (Math.random() - 0.5) * 0.04;

        } else {
          const r = Math.pow(Math.random(), params.radialFalloff) * radius * params.initialSpawnRadiusFraction;
          const theta = Math.random() * 2 * Math.PI;
          const phi = Math.acos(2 * Math.random() - 1);
          positions[i3] = r * Math.sin(phi) * Math.cos(theta) + (Math.random() - 0.5) * r * 0.02;
          positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * r * 0.02;
          positions[i3 + 2] = r * Math.cos(phi) + (Math.random() - 0.5) * r * 0.02;

          velocities[i] = (0.015 + Math.random() * 0.08) * params.velocityScalarScale;
          velocitiesVec[i3] = (Math.random() - 0.5) * 0.04;
          velocitiesVec[i3 + 1] = (Math.random() - 0.5) * 0.03;
          velocitiesVec[i3 + 2] = (Math.random() - 0.5) * 0.04;
        }

        colors[i3] = 1.0; colors[i3 + 1] = 1.0; colors[i3 + 2] = 1.0;
      }

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const sprite = document.createElement("canvas");
      const spriteSize = params.quality === "low" ? 24 : 48;
      sprite.width = spriteSize; sprite.height = spriteSize;
      const ctx = sprite.getContext("2d");
      ctx.clearRect(0, 0, spriteSize, spriteSize);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(spriteSize / 2, spriteSize / 2, Math.floor(spriteSize * 0.44), 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();

      const spriteTex = new THREE.CanvasTexture(sprite);
      spriteTex.minFilter = THREE.NearestFilter;
      spriteTex.magFilter = THREE.NearestFilter;
      spriteTex.generateMipmaps = false;

      const material = new THREE.PointsMaterial({
        size: params.baseSize,
        sizeAttenuation: params.sizeAttenuation,
        map: spriteTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.52,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false
      });
      material.alphaTest = 0.05;

      particleSystem = new THREE.Points(geometry, material);
      baseVelocitiesVec = null;
      velocitiesVec.fill(0);
      particleSystem.frustumCulled = particleSystemEffectiveCount < 5000;
      scene.add(particleSystem);

      // ===== CORES =====
      const coreCountLocal = coreCountLocalUse;
      const corePositions = new Float32Array(coreCountLocal * 3);
      const coreColors = new Float32Array(coreCountLocal * 3);
      const coreVel = new Float32Array(coreCountLocal * 3);

      coreOrbitPhases = new Float32Array(coreCountLocal);
      for (let ph = 0; ph < coreCountLocal; ph++) coreOrbitPhases[ph] = Math.random() * Math.PI * 2.0;

      coreAttractStrengths = new Float32Array(coreCountLocal);
      coreOrbitScales = new Float32Array(coreCountLocal);

      for (let i = 0; i < coreCountLocal; i++) {
        const i3 = i * 3;

        if (Math.random() < 0.55 && clusters.length > 0) {
          const c = clusters[Math.floor(Math.random() * clusters.length)];
          const cr = Math.random() * params.clusterRadiusFactor * 1.2 * radius;
          corePositions[i3] = c.x + (Math.random() - 0.5) * cr;
          corePositions[i3 + 1] = c.y + (Math.random() - 0.5) * cr * 0.6;
          corePositions[i3 + 2] = c.z + (Math.random() - 0.5) * cr;
        } else {
          const r = (0.08 + Math.random() * 0.9) * radius * (0.4 + Math.random() * 0.9) * params.initialSpawnRadiusFraction;
          const theta = Math.random() * 2 * Math.PI;
          const phi = Math.acos(2 * Math.random() - 1);
          corePositions[i3] = r * Math.sin(phi) * Math.cos(theta);
          corePositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
          corePositions[i3 + 2] = r * Math.cos(phi);
        }

        coreColors[i3] = 1.0; coreColors[i3 + 1] = 1.0; coreColors[i3 + 2] = 1.0;

        coreVel[i3] = 0;
        coreVel[i3 + 1] = 0;
        coreVel[i3 + 2] = 0;

        coreAttractStrengths[i] = params.attractStrengthMin + Math.random() * (params.attractStrengthMax - params.attractStrengthMin);
        coreOrbitScales[i] = params.orbitScaleMin + Math.random() * (params.orbitScaleMax - params.orbitScaleMin);
      }

      const coreMat = new THREE.PointsMaterial({
        size: params.baseSize * 1.2,
        sizeAttenuation: params.sizeAttenuation,
        map: spriteTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.80,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false
      });
      coreMat.alphaTest = 0.05;

      const coreGeom = new THREE.BufferGeometry();
      coreGeom.setAttribute("position", new THREE.BufferAttribute(corePositions, 3));
      coreGeom.setAttribute("color", new THREE.BufferAttribute(coreColors, 3));

      coreSystem = new THREE.Points(coreGeom, coreMat);
      coreSystem.frustumCulled = false;
      scene.add(coreSystem);

      baseCoreVel = null;
      for (let i = 0; i < coreVel.length; i++) coreVel[i] = 0.0;

      corePositionsArr = corePositions;
      coreVelArr = coreVel;
      coreCount = coreCountLocal;
    }

    function animate() {
      requestAnimationFrame(animate);

      const now = performance.now();
      let targetInterval = params.activeFrameInterval;
      if (document.hidden || !isInViewport) targetInterval = params.hiddenFrameInterval;
      else {
        const sinceRelease = releaseStartTime > 0 ? now - releaseStartTime : Infinity;
        const keepActiveAfterRelease = releaseStartTime > 0 && sinceRelease < params.postReleaseActiveMs;
        targetInterval = (attractionActive || keepActiveAfterRelease) ? params.activeFrameInterval : params.idleFrameInterval;
      }
      if (now - lastRenderTime < targetInterval) return;
      lastRenderTime = now;

      cameraAngle += 0.00008;
      const cr = params.cameraRadius;
      camera.position.x = Math.sin(cameraAngle) * cr;
      camera.position.z = Math.cos(cameraAngle) * cr;
      camera.position.y = params.cameraHeight;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
      frameCount++;
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);

      const rect = renderer.domElement.getBoundingClientRect();
      const area = Math.max(1, rect.width * rect.height);
      const smallCanvas = area < 800 * 200;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, smallCanvas ? 1 : 1.5));
    }

    function onMouseMove(event) {
      mouse.x = event.clientX / window.innerWidth - 0.5;
      mouse.y = event.clientY / window.innerHeight - 0.5;
      mouseNdc.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseNdc.y = -(event.clientY / window.innerHeight) * 2 + 1;

      if (attractionActive && raycaster) {
        raycaster.setFromCamera(mouseNdc, camera);
        raycaster.ray.intersectPlane(plane, targetCursor);
      }
    }

    function onPointerDown(e) {
      onMouseMove(e);
      attractionActive = true;
      lastClickTime = performance.now();
      if (raycaster) {
        raycaster.setFromCamera(mouseNdc, camera);
        raycaster.ray.intersectPlane(plane, targetCursor);
        cursor3D.copy(targetCursor);
      }
    }

    function onPointerUp() {
      attractionActive = false;
      lastClickTime = performance.now();
      releaseStartTime = performance.now();
      releaseOrigin.copy(cursor3D);
      if (params.enableSceneRotation) {
        sceneSpinVel += (Math.random() * 2 - 1) * params.releaseSpinImpulse;
      }
    }

    // ================== FIN TU CÓDIGO ORIGINAL ==================
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
