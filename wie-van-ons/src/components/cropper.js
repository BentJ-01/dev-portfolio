// Eenvoudige vierkante crop met slepen en zoomen (slider, pinch of scrollwiel).
// Resultaat: JPEG van max. 400x400 px, ~80% kwaliteit.

const OUTPUT = 400;
const MAX_BYTES = 1024 * 1024;

async function loadImage(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* val terug op <img> */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Deze foto kan niet geopend worden. Probeer een andere.'));
    };
    img.src = url;
  });
}

function toBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/** Opent de cropper. Geeft een JPEG-Blob terug, of null als de speler annuleert. */
export async function cropImage(file) {
  const img = await loadImage(file);
  const iw = img.width;
  const ih = img.height;

  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal cropper" role="dialog" aria-modal="true" aria-label="Foto bijsnijden">
        <h2>Zet jezelf in het midden</h2>
        <p class="muted small">Sleep om te verschuiven, zoom met de slider of met twee vingers.</p>
        <div class="crop-stage"><canvas></canvas><div class="crop-mask"></div></div>
        <label class="crop-zoom">
          <span aria-hidden="true">➖</span>
          <input type="range" min="1" max="4" step="0.01" value="1" aria-label="Zoom">
          <span aria-hidden="true">➕</span>
        </label>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-act="cancel">Annuleer</button>
          <button class="btn btn-primary" data-act="ok">Gebruik deze foto</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const stage = wrap.querySelector('.crop-stage');
    const canvas = wrap.querySelector('canvas');
    const slider = wrap.querySelector('input[type=range]');
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let view = 0; // zijde van het zichtbare vierkant in CSS-pixels
    let zoom = 1;
    let cx = iw / 2; // middelpunt van de crop in beeldcoördinaten
    let cy = ih / 2;

    const base = () => view / Math.min(iw, ih); // schaal bij zoom 1 (cover)
    const scale = () => base() * zoom;

    function clamp() {
      const half = view / scale() / 2;
      cx = Math.min(Math.max(cx, half), iw - half);
      cy = Math.min(Math.max(cy, half), ih - half);
    }

    function draw() {
      clamp();
      const s = scale();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, view, view);
      ctx.drawImage(img, view / 2 - cx * s, view / 2 - cy * s, iw * s, ih * s);
    }

    function resize() {
      view = stage.clientWidth;
      canvas.width = view * dpr;
      canvas.height = view * dpr;
      canvas.style.width = `${view}px`;
      canvas.style.height = `${view}px`;
      draw();
    }

    function setZoom(z, fx = view / 2, fy = view / 2) {
      // zoom rond het focuspunt (fx, fy) in canvas-coördinaten
      const before = scale();
      const px = cx + (fx - view / 2) / before;
      const py = cy + (fy - view / 2) / before;
      zoom = Math.min(Math.max(z, 1), 4);
      const after = scale();
      cx = px - (fx - view / 2) / after;
      cy = py - (fy - view / 2) / after;
      slider.value = String(zoom);
      draw();
    }

    const pointers = new Map();
    let pinchStart = null;

    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const next = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, next);
      if (pointers.size === 1) {
        cx -= (next.x - prev.x) / scale();
        cy -= (next.y - prev.y) / scale();
        draw();
      } else if (pointers.size === 2 && pinchStart) {
        const [a, b] = [...pointers.values()];
        const rect = canvas.getBoundingClientRect();
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        setZoom(pinchStart.zoom * (dist / pinchStart.dist), (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
      }
    });
    const release = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = null;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        setZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - rect.left, e.clientY - rect.top);
      },
      { passive: false },
    );
    slider.addEventListener('input', () => setZoom(Number(slider.value)));

    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    async function finish(ok) {
      window.removeEventListener('resize', onResize);
      if (!ok) {
        wrap.remove();
        img.close?.();
        return resolve(null);
      }
      const out = document.createElement('canvas');
      out.width = OUTPUT;
      out.height = OUTPUT;
      const octx = out.getContext('2d');
      octx.fillStyle = '#fff';
      octx.fillRect(0, 0, OUTPUT, OUTPUT);
      const side = view / scale(); // zijde van de crop in beeldpixels
      octx.imageSmoothingQuality = 'high';
      octx.drawImage(img, cx - side / 2, cy - side / 2, side, side, 0, 0, OUTPUT, OUTPUT);
      let quality = 0.8;
      let blob = await toBlob(out, quality);
      while (blob && blob.size > MAX_BYTES && quality > 0.4) {
        quality -= 0.1;
        blob = await toBlob(out, quality);
      }
      wrap.remove();
      img.close?.();
      resolve(blob);
    }

    wrap.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act) finish(act === 'ok');
    });

    requestAnimationFrame(resize);
  });
}
