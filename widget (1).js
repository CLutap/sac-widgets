/* =============================================================================
 * SAP Analytics Cloud — Custom Widget
 * HTML Viewer  |  com-custom-htmlviewer  |  v1.0.0
 *
 * Power BI "HTML Viewer" equivalent for SAC.
 * -----------------------------------------------------------------------------
 * FEATURES
 *   • Inline mode  — renders raw HTML / full documents via <iframe srcdoc>
 *   • URL mode     — embeds any https:// page via <iframe src>
 *   • ECharts, D3, Chart.js, Leaflet… — any JS library works inside the iframe
 *   • postMessage bridge — forwards <a> clicks to SAC scripting as onLinkClick
 *   • SAC Scripting API: setHtml(), getHtml(), loadUrl(), refresh()
 *   • Sandbox toggle   — isolate untrusted content when needed
 * -----------------------------------------------------------------------------
 * MANIFEST PROPERTIES
 *   htmlContent    {string}  Raw HTML to render (overridden by contentUrl)
 *   contentUrl     {string}  External URL (takes priority over htmlContent)
 *   enableSandbox  {boolean} Apply sandbox attribute (default: false)
 *   backgroundColor{string}  CSS color injected into iframe <body>
 * ============================================================================= */
(function () {
  'use strict';

  /* ── Default placeholder shown when no content is configured ──────────── */
  const PLACEHOLDER = `
    <div style="
        display:flex;flex-direction:column;align-items:center;
        justify-content:center;height:100%;padding:24px;
        font-family:'72 Brand','72',Arial,Helvetica,sans-serif;
        font-size:14px;color:#32363a;text-align:center;box-sizing:border-box;">
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"
           viewBox="0 0 32 32" fill="#0070F2">
        <path d="M28 4H4a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h24a2 2 0 0 0
                 2-2V6a2 2 0 0 0-2-2zm0 22H4V10h24z"/>
        <path d="M8 14h10v2H8zm0 4h8v2H8z"/>
      </svg>
      <p style="margin:14px 0 6px;font-size:15px;font-weight:600;">HTML Viewer</p>
      <p style="margin:0;color:#6a6d70;max-width:260px;line-height:1.5;">
        Open the <strong>Builder Panel</strong> (right side) and paste your HTML,
        or use <code style="background:#f5f6f7;padding:2px 5px;border-radius:3px;">
        setHtml()</code> from SAC scripting.
      </p>
    </div>`;

  /* ── Wrap an HTML fragment in a full document skeleton ────────────────── */
  function wrapFragment(html, bgColor) {
    // If the caller supplied a full document, pass it straight through
    if (/^<!doctype|^<html/i.test(html.trim())) return html;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 8px;
      font-family: '72 Brand', '72', Arial, Helvetica, sans-serif;
      font-size: 14px; line-height: 1.5; color: #32363a;
      background: ${bgColor || 'transparent'};
      overflow: auto;
    }
    a { color: #0070F2; text-decoration: none; }
    a:hover { text-decoration: underline; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e4e4e4; padding: 8px 12px; text-align: left; }
    th { background: #f5f6f7; font-weight: 600; }
    h1, h2, h3, h4, h5, h6 { margin: 0 0 8px; color: #32363a; }
    p { margin: 0 0 12px; }
    pre, code {
      font-family: monospace; font-size: 13px;
      background: #f5f6f7; padding: 2px 6px; border-radius: 3px;
    }
    pre { padding: 12px; overflow-x: auto; }
  </style>
  <script>
    /*
     * postMessage bridge — intercepted by the outer Web Component.
     * This lets SAC scripting react to link clicks inside the iframe
     * (see the onLinkClick event in manifest.json).
     */
    document.addEventListener('click', function (e) {
      var anchor = e.target.closest('a[href]');
      if (anchor) {
        e.preventDefault();
        window.parent.postMessage({
          type : 'htmlviewer_link_click',
          href : anchor.href,
          text : anchor.textContent.trim()
        }, '*');
      }
    });
  <\/script>
</head>
<body>
${html}
</body>
</html>`;
  }

  /* =========================================================================
   * Main Widget Web Component
   * ========================================================================= */
  class HTMLViewerWidget extends HTMLElement {

    constructor() {
      super();

      // Shadow DOM keeps the widget's styles isolated from SAC's own styles
      this._root = this.attachShadow({ mode: 'open' });
      this._root.innerHTML = `
        <style>
          :host {
            display: block;
            width: 100%;
            height: 100%;
            overflow: hidden;
            position: relative;
          }
          iframe {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
          }
        </style>
        <iframe id="viewer-frame" title="HTML Viewer"></iframe>`;

      this._frame = this._root.getElementById('viewer-frame');

      // Internal property mirror — SAC pushes changes via lifecycle callbacks
      this._props = {
        htmlContent:     '',
        contentUrl:      '',
        enableSandbox:   false,
        backgroundColor: 'transparent'
      };

      // Bound once so we can cleanly remove it in disconnectedCallback
      this._onMessage = this._handleMessage.bind(this);
    }

    /* ── Standard Web Component callbacks ──────────────────────────────── */

    connectedCallback() {
      window.addEventListener('message', this._onMessage);
      this._render();
    }

    disconnectedCallback() {
      window.removeEventListener('message', this._onMessage);
    }

    /* ── SAC Custom Widget lifecycle callbacks ──────────────────────────── */

    /**
     * Called by SAC BEFORE properties are applied.
     * Use this for validation or to block a bad update.
     * @param {Object} changed  Map of property name → new value
     */
    onCustomWidgetBeforeUpdate(changed) {
      // Validate contentUrl: must start with https:// if set
      if (changed.contentUrl && changed.contentUrl.trim() &&
          !/^https?:\/\//i.test(changed.contentUrl.trim())) {
        console.warn('[HTML Viewer] contentUrl must be a valid http(s):// URL. Value ignored.');
        delete changed.contentUrl;
      }
    }

    /**
     * Called by SAC AFTER properties have been applied.
     * Merge the new values and re-render.
     * @param {Object} changed  Map of property name → new value
     */
    onCustomWidgetAfterUpdate(changed) {
      Object.assign(this._props, changed);
      this._render();
    }

    /**
     * Called by SAC when the widget container is resized.
     * @param {number} width   New width in px
     * @param {number} height  New height in px
     */
    onCustomWidgetResize(width, height) {
      this._frame.style.width  = width  + 'px';
      this._frame.style.height = height + 'px';
    }

    /** Called by SAC when the widget is removed from the story */
    onCustomWidgetDestroy() {
      window.removeEventListener('message', this._onMessage);
    }

    /* ── SAC Scripting API ──────────────────────────────────────────────── */
    /*
     * These methods are callable from SAC's Script Editor, e.g.:
     *   HTMLViewer_1.setHtml("<h2>Hello</h2>");
     *   HTMLViewer_1.loadUrl("https://my-app.example.com/dashboard");
     */

    /**
     * Replace widget content with an HTML string.
     * @param {string} html  HTML fragment or full document
     */
    setHtml(html) {
      this._props.htmlContent = String(html || '');
      this._props.contentUrl  = '';   // inline mode wins when set via script
      this._render();
    }

    /**
     * Returns the current htmlContent property value.
     * @returns {string}
     */
    getHtml() {
      return this._props.htmlContent;
    }

    /**
     * Load an external URL into the iframe.
     * @param {string} url  Fully-qualified https:// URL
     */
    loadUrl(url) {
      this._props.contentUrl  = String(url || '');
      this._props.htmlContent = '';   // URL mode wins when set via script
      this._render();
    }

    /** Force-reload the current iframe content (e.g. after a data refresh). */
    refresh() {
      this._render();
    }

    /* ── Private: re-render the iframe ─────────────────────────────────── */

    _render() {
      const { contentUrl, htmlContent, enableSandbox, backgroundColor } = this._props;
      const frame = this._frame;

      // ── Sandbox ─────────────────────────────────────────────────────────
      if (enableSandbox) {
        // allow-scripts: JS runs inside the iframe
        // same-origin is intentionally EXCLUDED so the iframe cannot
        // access SAC's cookies, localStorage, or DOM.
        frame.setAttribute('sandbox', 'allow-scripts allow-forms');
      } else {
        frame.removeAttribute('sandbox');
      }

      // ── Content ─────────────────────────────────────────────────────────
      const url = contentUrl && contentUrl.trim();

      if (url) {
        // URL mode — load the external page
        frame.removeAttribute('srcdoc');
        frame.src = url;
      } else if (htmlContent && htmlContent.trim()) {
        // Inline HTML mode — srcdoc avoids browser security restrictions
        // that block data: URIs and about:blank navigation
        frame.removeAttribute('src');
        frame.setAttribute('srcdoc', wrapFragment(htmlContent.trim(), backgroundColor));
      } else {
        // No content yet — show the placeholder
        frame.removeAttribute('src');
        frame.setAttribute('srcdoc', wrapFragment(PLACEHOLDER, backgroundColor));
      }

      // ── onContentLoad event ─────────────────────────────────────────────
      frame.onload = () => {
        this.dispatchEvent(new CustomEvent('onContentLoad', {
          bubbles: true,
          detail:  { source: url || 'inline' }
        }));
      };
    }

    /* ── Private: intercept postMessage from the iframe ─────────────────── */

    _handleMessage(event) {
      const d = event.data;
      if (!d || d.type !== 'htmlviewer_link_click') return;

      // Fire the SAC onLinkClick event — available in SAC scripting as:
      //   HTMLViewer_1.onLinkClick.setHandler(function(event) {
      //     var href = event.parameters.href;
      //     var text = event.parameters.text;
      //     // drive a filter, open a popup, etc.
      //   });
      this.dispatchEvent(new CustomEvent('onLinkClick', {
        bubbles: true,
        detail:  { href: d.href, text: d.text }
      }));
    }
  }

  /* Register the custom element — tag must match manifest.json */
  customElements.define('com-custom-htmlviewer', HTMLViewerWidget);

})();
