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
