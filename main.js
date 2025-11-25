/**
 * ⚔️ TILEFORGE GAME FRAMEWORK v2.0
 * A pure JS, dependency-free framework for tile-based browser games.
 * * Features:
 * - DOM-based rendering engine (High performance via CSS3 transforms)
 * - Built-in Keyboard/Input Manager (WASD + Arrows)
 * - Automatic Viewport Scrolling
 * - Modal & UI System
 * - CSS Injection (No external stylesheet needed)
 * - OOP Entity Structure
 */

(function (global) {
  "use strict";

  // --- 1. CORE STYLES (Injected Automatically) ---
  const TF_STYLES = `
        :root {
            --tf-bg: #121212;
            --tf-surface: #1e1e1e;
            --tf-primary: #8e44ad;
            --tf-accent: #00cec9;
            --tf-text: #ecf0f1;
            --tf-radius: 6px;
            --tf-shadow: 0 8px 16px rgba(0,0,0,0.5);
        }
        .tf-app { position: relative; width: 100%; height: 100vh; overflow: hidden; background: var(--tf-bg); color: var(--tf-text); font-family: sans-serif; }
        .tf-viewport { width: 100%; height: 100%; overflow-y: auto; position: relative; scroll-behavior: smooth; }
        .tf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; padding: 20px; }
        
        /* Entities / Tiles */
        .tf-entity {
            background: var(--tf-surface); border-radius: var(--tf-radius);
            position: relative; cursor: pointer; overflow: hidden;
            transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s;
            border: 2px solid transparent; aspect-ratio: 1;
            display: flex; flex-direction: column;
        }
        .tf-entity.tf-focused { border-color: var(--tf-accent); transform: scale(1.05); z-index: 10; box-shadow: 0 0 15px var(--tf-accent); }
        .tf-entity-img { width: 100%; height: 70%; object-fit: cover; pointer-events: none; }
        .tf-entity-body { padding: 10px; flex: 1; display: flex; flex-direction: column; justify-content: center; text-align: center; }
        
        /* UI Elements */
        .tf-btn { background: var(--tf-primary); color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; margin: 5px; }
        .tf-btn:hover { filter: brightness(1.2); }
        .tf-btn.secondary { background: #444; }
        .tf-input { background: #333; border: 1px solid #555; color: white; padding: 8px; border-radius: 4px; width: 100%; margin: 10px 0; box-sizing: border-box; }
        
        /* Modal */
        .tf-modal-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85);
            display: flex; align-items: center; justify-content: center; z-index: 999;
            opacity: 0; pointer-events: none; transition: opacity 0.2s;
        }
        .tf-modal-overlay.active { opacity: 1; pointer-events: all; }
        .tf-modal { background: var(--tf-surface); padding: 24px; border-radius: 8px; max-width: 500px; width: 90%; box-shadow: var(--tf-shadow); transform: translateY(20px); transition: transform 0.2s; }
        .tf-modal-overlay.active .tf-modal { transform: translateY(0); }
    `;

  // --- 2. FORGE ENGINE (DOM Utilities) ---
  class Forge {
    constructor(selector) {
      this.els =
        typeof selector === "string"
          ? document.querySelectorAll(selector)
          : [selector];
    }

    css(styles) {
      this.els.forEach((el) => Object.assign(el.style, styles));
      return this;
    }
    addClass(c) {
      this.els.forEach((el) => el.classList.add(c));
      return this;
    }
    removeClass(c) {
      this.els.forEach((el) => el.classList.remove(c));
      return this;
    }
    on(evt, fn) {
      this.els.forEach((el) => el.addEventListener(evt, fn));
      return this;
    }
    html(h) {
      if (h === undefined) return this.els[0]?.innerHTML;
      this.els.forEach((el) => (el.innerHTML = h));
      return this;
    }
    val(v) {
      if (v === undefined) return this.els[0]?.value;
      this.els.forEach((el) => (el.value = v));
      return this;
    }
    append(child) {
      this.els.forEach((el) =>
        el.appendChild(child instanceof HTMLElement ? child : child.element)
      );
      return this;
    }
  }
  const $ = (sel) => new Forge(sel);

  // --- 3. BASE OBJECTS ---
  class GameObject {
    constructor(props = {}) {
      this.id = props.id || Math.random().toString(36).substr(2, 9);
      this.props = props;
      this.element = null;
      this.isDirty = true;
    }

    update(dt) {
      /* Override me */
    }
    render() {
      /* Override me */ return this.element;
    }
    destroy() {
      if (this.element) this.element.remove();
    }
  }

  // --- 4. GAME ENTITIES ---
  class TileEntity extends GameObject {
    constructor(props) {
      super(props);
      this.title = props.title || "Unknown";
      this.image = props.image || ""; // URL or Base64
      this.onClick = props.onClick || null;
      this.element = document.createElement("div");
      this.element.className = "tf-entity";
      this.build();
    }

    build() {
      // DOM structure
      this.element.innerHTML = `
                ${
                  this.image
                    ? `<img src="${this.image}" class="tf-entity-img" alt="tile">`
                    : '<div style="height:70%; background:#333;"></div>'
                }
                <div class="tf-entity-body">
                    <strong>${this.title}</strong>
                    <small>${this.props.subtitle || ""}</small>
                </div>
            `;

      this.element.addEventListener("click", () => {
        if (this.onClick) this.onClick(this);
      });

      // Hover effect handled by CSS, but logical focus is handled by Game Input
    }
  }

  // --- 5. SYSTEMS ---

  // UI Manager (Modals, HUD)
  class UIManager {
    constructor(root) {
      this.root = root;
      this.createModalDOM();
    }

    createModalDOM() {
      const overlay = document.createElement("div");
      overlay.className = "tf-modal-overlay";
      overlay.innerHTML = `
                <div class="tf-modal">
                    <h2 id="tf-m-title"></h2>
                    <div id="tf-m-body"></div>
                    <div id="tf-m-foot" style="margin-top:20px; text-align:right;"></div>
                </div>
            `;
      document.body.appendChild(overlay);
      this.modalEl = overlay;
    }

    modal(title, contentHtml, buttons = []) {
      $("#tf-m-title").html(title);
      $("#tf-m-body").html(contentHtml);
      const foot = $("#tf-m-foot").html("");

      buttons.forEach((btn) => {
        const b = document.createElement("button");
        b.className = `tf-btn ${btn.type || "primary"}`;
        b.innerText = btn.label;
        b.onclick = () => btn.action(() => this.closeModal());
        foot.append(b);
      });

      $(this.modalEl).addClass("active");
    }

    closeModal() {
      $(this.modalEl).removeClass("active");
    }
  }

  // Input & Camera System
  class InputSystem {
    constructor(gridContainer) {
      this.container = gridContainer;
      this.focusedIndex = -1;
      this.items = [];
      this.cols = 1;
      this.active = true;

      window.addEventListener("keydown", (e) => this.handleKey(e));
      window.addEventListener("resize", () => this.calcMetrics());
    }

    registerItems(items) {
      this.items = items;
      this.calcMetrics();
      if (this.items.length > 0) {
        this.focusedIndex = 0;
        this.focus(0);
      } else {
        this.focusedIndex = -1;
      }
    }

    calcMetrics() {
      if (this.items.length === 0) return;
      const gridW = this.container.offsetWidth;
      const itemW = this.items[0].element.offsetWidth;
      if (!itemW || itemW <= 0) {
        this.cols = 1;
      } else {
        this.cols = Math.floor(gridW / (itemW + 16)); // 16 = gap
        if (!isFinite(this.cols) || this.cols < 1) this.cols = 1;
      }
    }

    focus(index) {
      if (index < 0) index = 0;
      if (index >= this.items.length) index = this.items.length - 1;

      // Visual Update
      this.focusedIndex = index;
      const target = this.items[index];
      if (target && target.element) {
        $(target.element).addClass("tf-focused");

      const target = this.items[index];
      $(target.element).addClass("tf-focused");

      // Camera Follow / Scroll
      if (target.element && document.body.contains(target.element)) {
        target.element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }
        inline: "nearest",
      });
    }

    handleKey(e) {
      if (!this.active) return;

      // Re-calc in case of DOM reflow
      this.calcMetrics();

      switch (e.key) {
        case "ArrowRight":
          this.focus(this.focusedIndex + 1);
          break;
        case "ArrowLeft":
          this.focus(this.focusedIndex - 1);
          break;
        case "ArrowDown":
          this.focus(this.focusedIndex + this.cols);
          break;
        case "ArrowUp":
          this.focus(this.focusedIndex - this.cols);
          break;
        case "Enter":
        case " ":
          if (this.items[this.focusedIndex])
            this.items[this.focusedIndex].element.click();
          break;
      }
    }
  }

  // --- 6. MAIN ENGINE CLASS ---
  class TileForgeApp {
    constructor(config = {}) {
      this.containerId = config.container || "app";
      this.entities = [];
      this.injectCSS();

      // Setup DOM
      this.root = document.getElementById(this.containerId);
      if (!this.root) {
        this.root = document.createElement("div");
        this.root.id = this.containerId;
        document.body.appendChild(this.root);
      }
      $(this.root).addClass("tf-app");

      this.viewport = document.createElement("div");
      this.viewport.className = "tf-viewport";

      this.grid = document.createElement("div");
      this.grid.className = "tf-grid";

      this.viewport.appendChild(this.grid);
      this.root.appendChild(this.viewport);

      // Init Systems
      this.ui = new UIManager(this.root);
      this.input = new InputSystem(this.grid);

    injectCSS() {
      if (document.getElementById(`tf-css-${this.containerId}`)) return;
      const style = document.createElement("style");
      style.id = `tf-css-${this.containerId}`;
      // Scope all CSS rules to the app container
      const scopedStyles = TF_STYLES.replace(/(^|\n)\s*([^\s@][^,{]*)\s*{/g, (match, p1, selector) => {
        // Only scope class and element selectors, skip :root and @ rules
        if (selector.trim().startsWith(":root") || selector.trim().startsWith("@")) return match;
        return `${p1}#${this.containerId} ${selector} {`;
      });
      style.textContent = scopedStyles;
      document.head.appendChild(style);
    }
      if (document.getElementById("tf-css")) return;
      const style = document.createElement("style");
      style.id = "tf-css";
      style.textContent = TF_STYLES;
      document.head.appendChild(style);
    }

    addEntity(props) {
      const ent = new TileEntity(props);
      this.entities.push(ent);
      this.grid.appendChild(ent.element);
      this.input.registerItems(this.entities);
      return ent;
    }
    clear() {
      // Destroy all entities to clean up event listeners and references
      this.entities.forEach(ent => ent.destroy());
      this.grid.innerHTML = "";
      this.entities = [];
      this.input.registerItems([]);
    }

    clear() {
      this.grid.innerHTML = "";
      this.entities = [];
      this.input.registerItems([]);
    }

    loop(timestamp) {
      const dt = timestamp - this.lastTime;
      this.lastTime = timestamp;

      // Update all entities (for animations/logic)
      this.entities.forEach((ent) => ent.update(dt));

      requestAnimationFrame(this.loop);
    }

    // Exposed Utilities
    get $() {
      return $;
    }
  }

  // Expose to Window
  global.TileForge = TileForgeApp;
})(window);
