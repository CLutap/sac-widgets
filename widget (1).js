/* SAC Custom Widget — HTML Viewer v1.0.0
   Follows SAP Custom Widget Developer Framework pattern exactly:
   - no IIFE wrapper
   - class syntax (required by Custom Elements v1)
   - customElements.define at top level                        */

var PLACEHOLDER = '<div style="padding:20px;font-family:Arial,sans-serif;'
  + 'font-size:14px;color:#6a6d70;text-align:center;">'
  + '<p style="font-size:16px;color:#32363a;font-weight:bold;">HTML Viewer</p>'
  + '<p>Use <code>setHtml()</code> from SAC scripting to render content here.</p>'
  + '</div>';

function wrapHtml(html, bg) {
  if (/^<!doctype|^<html/i.test(html.trim())) { return html; }
  return '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    + '<style>*{box-sizing:border-box;}body{margin:0;padding:8px;'
    + 'font-family:Arial,sans-serif;font-size:14px;color:#32363a;'
    + 'background:' + (bg || 'transparent') + ';overflow:auto;}'
    + 'a{color:#0070F2;}table{border-collapse:collapse;width:100%;}'
    + 'th,td{border:1px solid #e4e4e4;padding:8px;text-align:left;}'
    + 'th{background:#f5f6f7;font-weight:bold;}</style>'
    + '<script>document.addEventListener("click",function(e){'
    + 'var a=e.target.closest("a[href]");if(a){e.preventDefault();'
    + 'window.parent.postMessage({type:"htmlviewer_link_click",'
    + 'href:a.href,text:a.textContent.trim()},"*");}});<\/script>'
    + '</head><body>' + html + '</body></html>';
}

var HTMLViewerWidget = class extends HTMLElement {

  constructor() {
    super();
    this._props = { htmlContent: '', contentUrl: '', enableSandbox: false, backgroundColor: 'transparent' };
    this._onMsg  = this._handleMessage.bind(this);
    var shadow   = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<style>:host{display:block;width:100%;height:100%;}'
      + 'iframe{width:100%;height:100%;border:none;display:block;}</style>'
      + '<iframe id="f" title="HTML Viewer"></iframe>';
    this._frame = shadow.getElementById('f');
  }

  connectedCallback() {
    window.addEventListener('message', this._onMsg);
    this._render();
  }

  disconnectedCallback() {
    window.removeEventListener('message', this._onMsg);
  }

  onCustomWidgetBeforeUpdate(changed) {
    Object.assign(this._props, changed);
  }

  onCustomWidgetAfterUpdate(changed) {
    Object.assign(this._props, changed);
    this._render();
  }

  onCustomWidgetResize(width, height) {
    this._frame.style.width  = width  + 'px';
    this._frame.style.height = height + 'px';
  }

  onCustomWidgetDestroy() {
    window.removeEventListener('message', this._onMsg);
  }

  setHtml(html) {
    this._props.htmlContent = String(html || '');
    this._props.contentUrl  = '';
    this._render();
  }

  getHtml() { return this._props.htmlContent; }

  loadUrl(url) {
    this._props.contentUrl  = String(url || '');
    this._props.htmlContent = '';
    this._render();
  }

  refresh() { this._render(); }

  _render() {
    var f   = this._frame;
    var p   = this._props;
    var url = p.contentUrl && p.contentUrl.trim();

    if (p.enableSandbox) { f.setAttribute('sandbox', 'allow-scripts allow-forms'); }
    else { f.removeAttribute('sandbox'); }

    if (url) {
      f.removeAttribute('srcdoc');
      f.src = url;
    } else if (p.htmlContent && p.htmlContent.trim()) {
      f.removeAttribute('src');
      f.setAttribute('srcdoc', wrapHtml(p.htmlContent.trim(), p.backgroundColor));
    } else {
      f.removeAttribute('src');
      f.setAttribute('srcdoc', wrapHtml(PLACEHOLDER, p.backgroundColor));
    }

    f.onload = function() {};
  }

  _handleMessage(event) {
    if (!event.data || event.data.type !== 'htmlviewer_link_click') { return; }
    this.dispatchEvent(new CustomEvent('onLinkClick', {
      bubbles: true,
      detail: { href: event.data.href, text: event.data.text }
    }));
  }
};

customElements.define('com-custom-htmlviewer', HTMLViewerWidget);
