/* =============================================================================
 * SAP Analytics Cloud — Custom Widget Builder Panel
 * HTML Viewer  |  com-custom-htmlviewer-builder  |  v1.0.0
 *
 * Rendered in SAC's right-side "Builder Panel" (Story Designer).
 * Lets the story author set HTML content, a content URL, the sandbox flag,
 * and a background colour — no coding required.
 *
 * Communication flow:
 *   1. SAC calls onCustomWidgetAfterUpdate() with current property values.
 *   2. Author edits the form fields and clicks "Apply".
 *   3. Builder dispatches a `propertiesChanged` CustomEvent with the new values.
 *   4. SAC merges the values into the widget model and calls
 *      onCustomWidgetAfterUpdate() on the MAIN widget (widget.js).
 * ============================================================================= */
(function () {
  'use strict';

  /* ── Styles ──────────────────────────────────────────────────────────────── */
  const CSS = `
    :host {
      display: block;
      font-family: '72 Brand', '72', Arial, Helvetica, sans-serif;
      font-size: 13px;
      color: #32363a;
      padding: 12px 14px 20px;
      box-sizing: border-box;
    }

    /* ── Section heading ── */
    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: #6a6d70;
      margin: 16px 0 6px;
    }
    .section-title:first-child { margin-top: 4px; }

    /* ── Divider ── */
    hr {
      border: none;
      border-top: 1px solid #e4e4e4;
      margin: 14px 0;
    }

    /* ── Label ── */
    label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #6a6d70;
      margin-bottom: 4px;
    }
    .field { margin-bottom: 12px; }

    /* ── Inputs ── */
    textarea, input[type="text"], input[type="url"], input[type="color"] {
      width: 100%;
      padding: 7px 10px;
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      font-family: inherit;
      font-size: 13px;
      color: #32363a;
      background: #ffffff;
      outline: none;
      box-sizing: border-box;
      transition: border-color .15s;
    }
    textarea { resize: vertical; min-height: 150px; }
    textarea:focus, input:focus { border-color: #0070F2; }

    input[type="color"] {
      padding: 2px 4px;
      height: 32px;
      cursor: pointer;
    }

    /* ── Hint text ── */
    .hint {
      font-size: 11px;
      color: #888888;
      margin-top: 3px;
      line-height: 1.45;
    }

    /* ── Checkbox row ── */
    .checkbox-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      cursor: pointer;
    }
    .checkbox-row input[type="checkbox"] {
      margin-top: 2px;
      width: 14px;
      height: 14px;
      accent-color: #0070F2;
      cursor: pointer;
      flex-shrink: 0;
    }
    .checkbox-row span { line-height: 1.45; }

    /* ── Mode badge ── */
    .mode-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }
    .badge {
      display: inline-block;
      padding: 3px 9px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      transition: all .2s;
    }
    .badge-html { background: #e8f4ff; color: #0057C2; }
    .badge-url  { background: #e8f9ef; color: #0a6640; }

    /* ── Apply button ── */
    .apply-btn {
      display: block;
      width: 100%;
      padding: 9px 0;
      margin-top: 6px;
      background: #0070F2;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background .15s;
    }
    .apply-btn:hover  { background: #0057C2; }
    .apply-btn:active { background: #003D8F; }

    /* ── Character counter ── */
    .char-counter {
      font-size: 11px;
      color: #888888;
      text-align: right;
      margin-top: 3px;
    }
  `;

  /* ── Template ────────────────────────────────────────────────────────────── */
  const TEMPLATE = `
    <style>${CSS}</style>

    <!-- Mode indicator -->
    <p class="section-title">Current Mode</p>
    <div class="mode-row">
      <span class="badge badge-html" id="mode-badge">Inline HTML</span>
    </div>

    <!-- HTML Content -->
    <p class="section-title">HTML Content</p>
    <div class="field">
      <textarea id="html-input"
        placeholder="Paste any HTML fragment here — or a full document (<!DOCTYPE html>…).&#10;&#10;ECharts example:&#10;<div id=&quot;chart&quot; style=&quot;width:100%;height:300px&quot;></div>&#10;<script src=&quot;https://cdn.jsdelivr.net/npm/echarts/dist/echarts.min.js&quot;></script>&#10;<script>echarts.init(document.getElementById('chart')).setOption({...})</script>"></textarea>
      <p class="char-counter" id="char-counter">0 characters</p>
      <p class="hint">Any HTML/JS works here (ECharts, D3, Chart.js, Leaflet…). Ignored when a Content URL is set.</p>
    </div>

    <hr />

    <!-- Content URL -->
    <p class="section-title">Content URL <span style="font-weight:400;text-transform:none;font-size:11px;">(overrides HTML content)</span></p>
    <div class="field">
      <input type="url" id="url-input" placeholder="https://example.com/page.html" />
      <p class="hint">Leave blank to use the HTML content above. Must start with https://.</p>
    </div>

    <hr />

    <!-- Options -->
    <p class="section-title">Options</p>

    <div class="field">
      <label for="bg-input">Background Colour</label>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="color" id="bg-color-picker" value="#ffffff" style="width:44px;padding:2px 4px;" />
        <input type="text"  id="bg-input" placeholder="transparent" style="flex:1;" />
      </div>
      <p class="hint">CSS colour for the iframe body (transparent, #ffffff, rgb(…)).</p>
    </div>

    <div class="field">
      <label class="checkbox-row" for="sandbox-check">
        <input type="checkbox" id="sandbox-check" />
        <span><strong>Enable Sandbox</strong> — restricts the iframe (scripts allowed, same-origin access blocked). Recommended <em>OFF</em> for ECharts / D3.</span>
      </label>
    </div>

    <hr />
    <button class="apply-btn" id="apply-btn">Apply Changes</button>`;

  /* ── Builder Panel Component ─────────────────────────────────────────────── */
  class HTMLViewerBuilder extends HTMLElement {

    constructor() {
      super();
      this._root = this.attachShadow({ mode: 'open' });
      this._root.innerHTML = TEMPLATE;

      // Cache DOM refs
      this._htmlInput    = this._root.getElementById('html-input');
      this._urlInput     = this._root.getElementById('url-input');
      this._bgInput      = this._root.getElementById('bg-input');
      this._bgPicker     = this._root.getElementById('bg-color-picker');
      this._sandboxCheck = this._root.getElementById('sandbox-check');
      this._applyBtn     = this._root.getElementById('apply-btn');
      this._modeBadge    = this._root.getElementById('mode-badge');
      this._charCounter  = this._root.getElementById('char-counter');

      // Event wiring
      this._urlInput.addEventListener('input',  () => this._syncBadge());
      this._htmlInput.addEventListener('input', () => this._syncCounter());
      this._bgPicker.addEventListener('input',  () => {
        this._bgInput.value = this._bgPicker.value;
      });
      this._bgInput.addEventListener('input',   () => {
        if (/^#[0-9a-f]{6}$/i.test(this._bgInput.value.trim())) {
          this._bgPicker.value = this._bgInput.value.trim();
        }
      });
      this._applyBtn.addEventListener('click',  () => this._applyChanges());
    }

    connectedCallback() {
      this._syncBadge();
      this._syncCounter();
    }

    /* ── SAC lifecycle — SAC pushes current property values to this panel ── */

    onCustomWidgetBeforeUpdate(changed) {}

    onCustomWidgetAfterUpdate(changed) {
      if ('htmlContent'     in changed) {
        this._htmlInput.value = changed.htmlContent || '';
        this._syncCounter();
      }
      if ('contentUrl'      in changed) {
        this._urlInput.value  = changed.contentUrl  || '';
      }
      if ('enableSandbox'   in changed) {
        this._sandboxCheck.checked = !!changed.enableSandbox;
      }
      if ('backgroundColor' in changed) {
        const bg = changed.backgroundColor || 'transparent';
        this._bgInput.value = bg;
        if (/^#[0-9a-f]{6}$/i.test(bg)) this._bgPicker.value = bg;
      }
      this._syncBadge();
    }

    /* ── Apply — push values back to the SAC widget model ─────────────────── */

    _applyChanges() {
      const url = this._urlInput.value.trim();

      // Basic URL validation
      if (url && !/^https?:\/\//i.test(url)) {
        alert('Content URL must start with https:// (or http://).');
        return;
      }

      this.dispatchEvent(new CustomEvent('propertiesChanged', {
        detail: {
          properties: {
            htmlContent:     this._htmlInput.value,
            contentUrl:      url,
            enableSandbox:   this._sandboxCheck.checked,
            backgroundColor: this._bgInput.value.trim() || 'transparent'
          }
        }
      }));
    }

    /* ── Private helpers ────────────────────────────────────────────────── */

    _syncBadge() {
      const isUrl = !!this._urlInput.value.trim();
      this._modeBadge.textContent  = isUrl ? 'URL Mode'     : 'Inline HTML';
      this._modeBadge.className    = isUrl ? 'badge badge-url' : 'badge badge-html';
    }

    _syncCounter() {
      const n = this._htmlInput.value.length;
      this._charCounter.textContent = n.toLocaleString() + ' character' + (n === 1 ? '' : 's');
    }
  }

  customElements.define('com-custom-htmlviewer-builder', HTMLViewerBuilder);

})();
