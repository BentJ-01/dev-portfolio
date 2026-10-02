export function homeView(root) {
  root.innerHTML = `<div class="phone home">
    <div class="hero">
      <div class="logo" aria-hidden="true">🕵️🍺</div>
      <h1>Wie van ons?</h1>
      <p class="muted">Het drankspel van het scoutsweekend.</p>
    </div>
    <a class="btn btn-primary btn-xl" href="#/join">Meedoen</a>
    <a class="btn btn-ghost" href="#/tv">TV-scherm openen</a>
  </div>`;
}
