(() => {
  "use strict";
  const roll = document.getElementById("bp-roll");
  const result = document.getElementById("bp-result");
  if (!roll || !result) return;
  const modes = [
    ["ROCKET / FACE 1", "ME TIME", "Choose one card from your own hand and play it yourself."],
    ["ORCHID / FACE 2", "YOUR PROBLEM", "Choose a card from your hand and invite another player to take it."],
    ["ARROWS / FACE 3", "THE LINEUP", "Collect private submissions, choose a card, and invite a recipient. With 7–12 players, only the three to your left submit."],
    ["LIPS / FACE 4", "ALL IN", "Choose a card and offer everyone a separate optional SPILL turn. No physical dares."]
  ];
  roll.addEventListener("click", () => {
    const n = window.crypto && typeof window.crypto.getRandomValues === "function"
      ? window.crypto.getRandomValues(new Uint8Array(1))[0] % 4
      : Math.floor(Math.random() * 4);
    const [label, mode, description] = modes[n];
    result.dataset.face = String(n + 1);
    document.getElementById("bp-face").textContent = String(n + 1);
    document.getElementById("bp-result-label").textContent = label;
    document.getElementById("bp-mode").textContent = mode;
    document.getElementById("bp-description").textContent = description;
    roll.textContent = "Roll again";
  });
})();

(() => {
  "use strict";
  const tabs = [...document.querySelectorAll("[data-theme-choice]")];
  for (const tab of tabs) tab.addEventListener("click", () => {
    const choice = tab.dataset.themeChoice;
    for (const t of tabs) t.setAttribute("aria-pressed", String(t === tab));
    document.getElementById("bp-ivory-proof").hidden = choice !== "ivory";
    document.getElementById("bp-noir-proof").hidden = choice !== "noir";
  });
  const stage = document.getElementById("bp-model-stage"), content = document.getElementById("bp-model-content");
  const status = document.getElementById("bp-model-status"), label = document.getElementById("bp-model-label");
  let library, active = 0;
  const configs = {
    box: {src:"assets/box.glb", alt:"Rotatable original BI PANIC! box model", title:"ORIGINAL BOX / 3D CONCEPT"},
    die: {src:"assets/die.glb", alt:"Rotatable original glitter Panic Die with custom symbols", title:"ORIGINAL PANIC DIE / 3D CONCEPT"}
  };
  function loadViewer() {
    if (customElements.get("model-viewer")) return Promise.resolve();
    if (!library) library = import("https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js").catch(e => {library = undefined; throw e;});
    return library;
  }
  document.querySelectorAll("[data-model]").forEach(button => button.addEventListener("click", async () => {
    const cfg = configs[button.dataset.model];
    if (!cfg) return;
    const request = ++active;
    stage.hidden = false; label.textContent = cfg.title; content.replaceChildren();
    status.textContent = "Loading interactive model…";
    try {
      await loadViewer();
      if (request !== active) return;
      const viewer = document.createElement("model-viewer");
      viewer.setAttribute("src", cfg.src); viewer.setAttribute("alt", cfg.alt);
      viewer.setAttribute("camera-controls", ""); viewer.setAttribute("touch-action", "pan-y");
      viewer.setAttribute("interaction-prompt", "none"); viewer.setAttribute("shadow-intensity", "0.7");
      viewer.addEventListener("load", () => {if(request===active) status.textContent = "Drag to rotate. Pinch or scroll to zoom.";}, {once:true});
      viewer.addEventListener("error", () => {if(request===active) status.textContent = "The 3D model could not load. The original rendered images remain available above.";}, {once:true});
      content.append(viewer);
    } catch(e) {if(request===active) status.textContent = "The viewer could not load. The original rendered images remain available above.";}
    stage.scrollIntoView({block:"nearest"});
  }));
  document.getElementById("bp-model-close").addEventListener("click", () => {active++;stage.hidden = true;content.replaceChildren();status.textContent="";document.querySelector("[data-model]").focus();});
})();
