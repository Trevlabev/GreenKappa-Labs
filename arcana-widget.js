(function () {
  "use strict";

  const CONFIG = window.GREENKAPPA_ARCANA_CONFIG || {};
  const KNOWLEDGE = window.TABLEARC_KNOWLEDGE || null;
  const ASSET_ROOT = "/assets/arcana/";

  let history = [];
  let busy = false;
  let isOpen = false;
  let lastFocusedElement = null;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function tokenize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9.+#/-]+/g, " ")
      .split(/\s+/)
      .filter(function (token) { return token.length > 2; });
  }

  function retrieve(question, limit) {
    if (!KNOWLEDGE || !Array.isArray(KNOWLEDGE.chunks)) return [];
    const terms = tokenize(question);

    return KNOWLEDGE.chunks
      .map(function (chunk) {
        const title = String(chunk.title || "").toLowerCase();
        const content = String(chunk.content || "").toLowerCase();
        const keywords = (chunk.keywords || []).join(" ").toLowerCase();
        let score = 0;

        terms.forEach(function (term) {
          if (title.indexOf(term) >= 0) score += 8;
          if (keywords.indexOf(term) >= 0) score += 6;
          score += Math.min(5, content.split(term).length - 1);
        });

        if (chunk.id === "product-thesis") score += 0.25;
        return { chunk: chunk, score: score };
      })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, limit || 3)
      .map(function (entry) { return entry.chunk; });
  }

  function summarizeChunk(chunk) {
    const content = String(chunk.content || "").trim();
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    const summary = sentences.slice(0, 2).join(" ").trim();
    return summary.length > 300 ? summary.slice(0, 297).trimEnd() + "…" : summary;
  }

  function recentUserContext(priorHistory) {
    return (Array.isArray(priorHistory) ? priorHistory : [])
      .filter(function (item) { return item && item.role === "user"; })
      .slice(-2)
      .map(function (item) { return String(item.content || ""); })
      .join(" ");
  }

  function intentText(question, priorHistory) {
    return (recentUserContext(priorHistory) + " " + String(question || "")).toLowerCase();
  }

  function sourceIds(ids) {
    const available = new Set(
      KNOWLEDGE && Array.isArray(KNOWLEDGE.chunks)
        ? KNOWLEDGE.chunks.map(function (chunk) { return chunk.id; })
        : []
    );
    return ids.filter(function (id) { return available.has(id); });
  }

  function offlineAnswer(question, priorHistory) {
    const context = intentText(question, priorHistory);

    if (/\b(fun|enjoy|enjoyable|entertaining|exciting|why play|thats fun|that's fun)\b/.test(context)) {
      return {
        answer:
          "Yes—but the fun is not the debugging or architecture. The fun is being able to try the kind of creative idea you would at a D&D table and having the game actually keep up. You can talk your way past a guard, investigate a clue, cast a spell, improvise a ridiculous plan, explore a map, or start a fight; TableArc tracks what changed so NPC reactions, resources, consequences, and later scenes follow from your choices. The goal is AI-DM freedom with the continuity and satisfying rules of a real campaign.",
        sources: sourceIds(["play-experience", "user-experience", "maps-combat", "modes"])
      };
    }

    if (/\b(what can|can you do|can i do|types of things|do with it|use cases|features|capabilities)\b/.test(context)) {
      return {
        answer:
          "You can create or import a character, generate and repair a playable adventure, run a solo or small-table session through normal language, roleplay with NPCs, investigate clues, use spells and abilities, explore spatial maps, resolve combat, save and resume the campaign, look up rules, generate recaps, and inspect the state or debug record when something goes wrong. A human DM can also use it as an assistant instead of handing over the whole table.",
        sources: sourceIds(["visitor-use-cases", "modes", "adventure-foundry", "mechanics", "maps-combat"])
      };
    }

    if (/\b(what is tablearc|what's tablearc|whats tablearc|plain english|explain tablearc)\b/.test(context)) {
      return {
        answer:
          "TableArc is a desktop AI-assisted D&D engine. You describe what your character does in normal language, while the app keeps track of the actual game—your character, the scene, NPCs, clues, maps, combat, resources, consequences, and saves. The AI supplies imagination and narration, but structured systems preserve what is true.",
        sources: sourceIds(["product-thesis", "user-experience"])
      };
    }

    if (/\b(how does|how it works|runtime|under the hood|architecture)\b/.test(context)) {
      return {
        answer:
          "You describe an action in plain language. TableArc interprets the intent, decides whether rules or a roll are needed, resolves the relevant character, scene, map, or combat systems, commits the result to canonical state, and only then asks the AI to narrate what happened. That order is what keeps a fluent answer from silently rewriting the game.",
        sources: sourceIds(["runtime-authority", "user-experience", "mechanics"])
      };
    }

    if (/\b(validated|working today|works today|implemented|finished|planned|roadmap|current state)\b/.test(context)) {
      return {
        answer:
          "[Validated] The latest supplied acceptance report proves a compact path from an empty profile through adventure generation, generated-character promotion, runtime commit, Live Play, state-derived actions, saving, and restart continuity. [Planned/active development] Longer campaigns, broader model coverage, accessibility, performance, presentation polish, and wider DM Assistant workflows still need continued hardening.",
        sources: sourceIds(["current-status", "roadmap", "adventure-foundry"])
      };
    }

    if (/\b(who built|who made|trevor|builder|developer|creator)\b/.test(context)) {
      return {
        answer:
          "TableArc is independently developed by Trevor Leininger through GreenKappa Labs. The project brings together product architecture, React/Vite/Electron development, OpenAI and Ollama integration, structured state, workflow design, testing, debugging, documentation, and interface design.",
        sources: sourceIds(["creator", "quality-method", "providers"])
      };
    }

    if (/\b(ollama|local model|offline|openai|provider|qwen)\b/.test(context)) {
      return {
        answer:
          "TableArc is designed around a generic provider layer rather than one hard-coded model. It can use hosted OpenAI models or local Ollama models, with the same provider contract serving live play, adventure generation, character repair, rules, recap, state, and debug workflows.",
        sources: sourceIds(["providers", "product-thesis"])
      };
    }

    if (/\b(d&d|dungeons|dungeon master|solo|campaign|play)\b/.test(context)) {
      return {
        answer:
          "The main experience is D&D-style solo or small-table play. You bring or create a character, enter a structured adventure, describe actions naturally, roleplay and investigate, use character abilities, move through scenes or maps, and resolve combat and consequences while the campaign remembers what happened.",
        sources: sourceIds(["play-experience", "modes", "mechanics", "maps-combat"])
      };
    }

    const query = recentUserContext(priorHistory) + " " + question;
    const top = retrieve(query, 3);
    if (!top.length) {
      return {
        answer: "I do not have enough packaged project information to answer that confidently.",
        sources: []
      };
    }

    const first = top[0];
    const second = top[1];
    return {
      answer: summarizeChunk(first) + (second ? "\n\nRelated: " + summarizeChunk(second) : ""),
      sources: top.map(function (chunk) { return chunk.id; })
    };
  }

  function markup() {
    return `
      <div id="arcanaAssistant" class="arcana-assistant" data-state="closed">
        <div id="arcanaNudge" class="arcana-assistant-nudge" role="status">
          <button id="arcanaNudgeClose" type="button" aria-label="Dismiss Ask Arcana suggestion">×</button>
          <strong>Questions about TableArc?</strong>
          <span>Ask Arcana.</span>
        </div>

        <button id="arcanaAssistantLauncher" class="arcana-assistant-launcher" type="button"
          aria-haspopup="dialog" aria-expanded="false" aria-controls="arcanaAssistantPanel">
          <span class="arcana-launcher-avatar"><img src="${ASSET_ROOT}idle.gif" alt=""></span>
          <span class="arcana-launcher-copy"><b>Ask Arcana</b><small>TableArc project guide</small></span>
          <i aria-hidden="true"></i>
        </button>

        <section id="arcanaAssistantPanel" class="arcana-assistant-panel" role="dialog"
          aria-modal="false" aria-labelledby="arcanaAssistantTitle" aria-hidden="true">
          <header class="arcana-assistant-header">
            <div class="arcana-assistant-identity">
              <span class="arcana-header-avatar"><img id="arcanaWidgetSprite" src="${ASSET_ROOT}idle.gif" alt=""></span>
              <span>
                <strong id="arcanaAssistantTitle">Ask Arcana</strong>
                <small id="arcanaWidgetStatus"><i></i><span>Starting guide</span></small>
              </span>
            </div>

            <label class="arcana-widget-mode">
              <span>Answer style</span>
              <select id="arcanaWidgetMode" aria-label="Arcana answer style">
                <option value="recruiter">Quick</option>
                <option value="technical">Technical</option>
              </select>
            </label>

            <button id="arcanaWidgetClear" class="arcana-widget-icon-button" type="button" title="Start a fresh conversation" aria-label="Start a fresh conversation">↻</button>
            <button id="arcanaWidgetClose" class="arcana-widget-icon-button" type="button" aria-label="Close Ask Arcana">×</button>
          </header>

          <div id="arcanaWidgetMessages" class="arcana-widget-messages" role="log" aria-live="polite" aria-relevant="additions">
            <article class="arcana-widget-message arcana">
              <div class="arcana-widget-message-avatar">A</div>
              <div class="arcana-widget-bubble">
                <strong>Arcana</strong>
                <p>Hi. Ask me what TableArc is, what you can do with it, why it is fun, how it works, or what has actually been validated.</p>
              </div>
            </article>
          </div>

          <div id="arcanaWidgetPrompts" class="arcana-widget-prompts" aria-label="Suggested questions">
            <button type="button" data-arcana-widget-question="What is TableArc, in plain English?">What is TableArc?</button>
            <button type="button" data-arcana-widget-question="What makes TableArc more than an AI story chatbot?">Why is it different?</button>
            <button type="button" data-arcana-widget-question="What has actually been validated, and what is still planned?">What works today?</button>
          </div>

          <div id="arcanaWidgetSources" class="arcana-widget-sources" hidden></div>

          <form id="arcanaWidgetForm" class="arcana-widget-form">
            <label for="arcanaWidgetInput">Ask about TableArc</label>
            <div>
              <textarea id="arcanaWidgetInput" rows="2" maxlength="700" enterkeyhint="send"
                placeholder="Type a question…"></textarea>
              <button id="arcanaWidgetSend" type="submit" aria-label="Send question">→</button>
            </div>
            <small>Enter sends · Shift + Enter adds a line · Do not submit sensitive information</small>
          </form>
        </section>
      </div>`;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(text, state, detail) {
    const status = $("arcanaWidgetStatus");
    if (!status) return;
    status.className = state || "";
    status.title = detail || "";
    status.innerHTML = "<i></i><span>" + escapeHtml(text) + "</span>";
  }

  function setSprite(name) {
    const sprite = $("arcanaWidgetSprite");
    const launcher = document.querySelector(".arcana-launcher-avatar img");
    const source = ASSET_ROOT + name + ".gif";
    if (sprite) sprite.src = source;
    if (launcher && name !== "review") launcher.src = source;
  }

  function addMessage(role, text, pendingId) {
    const log = $("arcanaWidgetMessages");
    if (!log) return null;

    const article = document.createElement("article");
    article.className = "arcana-widget-message " + role + (pendingId ? " pending" : "");
    if (pendingId) article.id = pendingId;

    article.innerHTML =
      '<div class="arcana-widget-message-avatar">' + (role === "user" ? "You" : "A") + '</div>' +
      '<div class="arcana-widget-bubble">' +
        '<strong>' + (role === "user" ? "You" : "Arcana") + '</strong>' +
        '<p>' + escapeHtml(text) + '</p>' +
      '</div>';

    log.appendChild(article);
    log.scrollTop = log.scrollHeight;
    return article;
  }

  function updateMessage(id, text) {
    const article = $(id);
    if (!article) return;
    const paragraph = article.querySelector("p");
    if (paragraph) paragraph.textContent = text;
    article.classList.remove("pending");
    const log = $("arcanaWidgetMessages");
    if (log) log.scrollTop = log.scrollHeight;
  }

  function renderSources(ids) {
    const container = $("arcanaWidgetSources");
    if (!container) return;

    if (!ids || !ids.length || !KNOWLEDGE) {
      container.hidden = true;
      container.innerHTML = "";
      return;
    }

    const sourceMap = {};
    KNOWLEDGE.chunks.forEach(function (chunk) { sourceMap[chunk.id] = chunk; });
    container.innerHTML = ids
      .map(function (id) { return sourceMap[id]; })
      .filter(Boolean)
      .map(function (chunk) {
        return "<span>" + escapeHtml(chunk.status) + " · " + escapeHtml(chunk.title) + "</span>";
      })
      .join("");
    container.hidden = false;
  }

  function clearConversation() {
    history = [];
    const log = $("arcanaWidgetMessages");
    if (log) {
      log.innerHTML = `
        <article class="arcana-widget-message arcana">
          <div class="arcana-widget-message-avatar">A</div>
          <div class="arcana-widget-bubble">
            <strong>Arcana</strong>
            <p>Fresh conversation. Ask me about TableArc’s product, architecture, validation, roadmap, or builder.</p>
          </div>
        </article>`;
    }
    renderSources([]);
    const prompts = $("arcanaWidgetPrompts");
    if (prompts) prompts.hidden = false;
    const input = $("arcanaWidgetInput");
    if (input) input.focus();
  }

  async function probeLiveGuide() {
    const endpoint = String(CONFIG.apiEndpoint || "");
    if (!endpoint || endpoint.indexOf("YOUR-ARCANA-SITE") >= 0) {
      setStatus("Live AI not connected", "offline", "Run CONNECT ASK ARCANA.cmd and publish the updated arcana-config.js file.");
      return false;
    }

    try {
      const response = await fetch(endpoint, { method: "GET", cache: "no-store" });
      const data = await response.json().catch(function () { return {}; });

      if (!response.ok) {
        setStatus("Guide endpoint needs update", "offline", data.message || ("Endpoint returned " + response.status));
        return false;
      }

      if (!data.configured) {
        setStatus("OpenAI key not configured", "offline", "The Netlify function is online, but OPENAI_API_KEY is missing from the production context.");
        return false;
      }

      setStatus("Live AI ready", "ready", "Netlify guide " + (data.version || "") + " · " + (data.model || "configured model"));
      return true;
    } catch (error) {
      setStatus("Guide endpoint unavailable", "offline", error.message || "The live guide could not be reached.");
      return false;
    }
  }

  async function postChat(payload) {
    const endpoint = String(CONFIG.apiEndpoint || "");
    if (!endpoint || endpoint.indexOf("YOUR-ARCANA-SITE") >= 0) {
      throw new Error("The live guide endpoint has not been connected yet.");
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.message || ("Request failed (" + response.status + ")"));
    return data;
  }

  async function ask(question) {
    if (busy) return;
    const clean = String(question || "").trim();
    const input = $("arcanaWidgetInput");
    if (!clean) {
      if (input) input.focus();
      return;
    }

    busy = true;
    const send = $("arcanaWidgetSend");
    const mode = $("arcanaWidgetMode");
    const prompts = $("arcanaWidgetPrompts");
    const priorHistory = history.slice(-6);

    if (input) input.value = "";
    if (send) send.disabled = true;
    if (prompts) prompts.hidden = true;

    addMessage("user", clean);
    history.push({ role: "user", content: clean });
    history = history.slice(-8);

    const pendingId = "arcana-widget-pending-" + Date.now();
    addMessage("arcana", "Checking the TableArc project record…", pendingId);
    setStatus("Checking project record", "loading");
    setSprite("review");

    try {
      const data = await postChat({
        question: clean,
        history: priorHistory,
        mode: mode ? mode.value : "recruiter"
      });

      const answer = String(data.answer || "I could not produce an answer.").trim();
      updateMessage(pendingId, answer);
      renderSources(data.sources || []);
      history.push({ role: "assistant", content: answer });
      history = history.slice(-8);
      setStatus("Grounded AI online", "ready");
      setSprite("waving");
    } catch (error) {
      const fallback = offlineAnswer(clean, priorHistory);
      updateMessage(pendingId, fallback.answer);
      renderSources(fallback.sources);
      history.push({ role: "assistant", content: fallback.answer });
      history = history.slice(-8);
      setStatus("Built-in guide active", "offline", error && error.message ? error.message : "The live AI request failed.");
      setSprite("failed");
    } finally {
      busy = false;
      if (send) send.disabled = false;
      if (input) input.focus();
      window.setTimeout(function () { setSprite("idle"); }, 2200);
    }
  }

  function updateBodyLock() {
    document.documentElement.classList.toggle("arcana-assistant-open", isOpen);
  }

  function openWidget(options) {
    const assistant = $("arcanaAssistant");
    const panel = $("arcanaAssistantPanel");
    const launcher = $("arcanaAssistantLauncher");
    const nudge = $("arcanaNudge");
    if (!assistant || !panel || !launcher) return;

    lastFocusedElement = document.activeElement;
    isOpen = true;
    assistant.dataset.state = "open";
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    if (nudge) nudge.hidden = true;
    sessionStorage.setItem("arcana-nudge-dismissed", "1");
    updateBodyLock();

    window.requestAnimationFrame(function () {
      const input = $("arcanaWidgetInput");
      if (!options || options.focus !== false) {
        if (input) input.focus();
      }
    });
  }

  function closeWidget() {
    const assistant = $("arcanaAssistant");
    const panel = $("arcanaAssistantPanel");
    const launcher = $("arcanaAssistantLauncher");
    if (!assistant || !panel || !launcher) return;

    isOpen = false;
    assistant.dataset.state = "closed";
    panel.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
    updateBodyLock();

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    } else {
      launcher.focus();
    }
  }

  function toggleWidget() {
    if (isOpen) closeWidget();
    else openWidget();
  }

  function bindTriggers() {
    document.querySelectorAll('a[href="#ask-arcana"], a[href$="/#ask-arcana"], [data-open-arcana]').forEach(function (trigger) {
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        openWidget();
        if (window.location.hash !== "#ask-arcana") {
          history.replaceState(null, "", window.location.pathname + window.location.search + "#ask-arcana");
        }
      });
    });
  }

  function initialize() {
    if (document.getElementById("arcanaAssistant")) return;
    document.body.insertAdjacentHTML("beforeend", markup());

    const launcher = $("arcanaAssistantLauncher");
    const close = $("arcanaWidgetClose");
    const clear = $("arcanaWidgetClear");
    const form = $("arcanaWidgetForm");
    const input = $("arcanaWidgetInput");
    const nudgeClose = $("arcanaNudgeClose");

    launcher.addEventListener("click", toggleWidget);
    close.addEventListener("click", closeWidget);
    clear.addEventListener("click", clearConversation);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      ask(input.value);
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        ask(input.value);
      }
    });

    document.querySelectorAll("[data-arcana-widget-question]").forEach(function (button) {
      button.addEventListener("click", function () {
        ask(button.getAttribute("data-arcana-widget-question") || "");
      });
    });

    nudgeClose.addEventListener("click", function () {
      $("arcanaNudge").hidden = true;
      sessionStorage.setItem("arcana-nudge-dismissed", "1");
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isOpen) closeWidget();
    });

    bindTriggers();

    setStatus("Checking live guide", "loading");
    probeLiveGuide();

    if (sessionStorage.getItem("arcana-nudge-dismissed") === "1") {
      $("arcanaNudge").hidden = true;
    } else {
      window.setTimeout(function () {
        if (!isOpen && $("arcanaNudge")) $("arcanaNudge").classList.add("visible");
      }, 900);
    }

    if (window.location.hash === "#ask-arcana") {
      window.setTimeout(function () { openWidget({ focus: false }); }, 120);
    }

    window.addEventListener("hashchange", function () {
      if (window.location.hash === "#ask-arcana") openWidget();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
}());
