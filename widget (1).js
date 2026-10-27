/* Minimal diagnostic widget — if this fails, the issue is SAC CSP/environment */
(function () {
  var root = document.createElement('template');
  root.innerHTML = '<style>:host{display:block;width:100%;height:100%;}</style>'
    + '<div style="padding:20px;font-family:Arial;font-size:16px;color:#0070F2;">'
    + '<strong>HTML Viewer loaded successfully.</strong>'
    + '</div>';

  var HTMLViewerWidget = (function (_HTMLElement) {
    function HTMLViewerWidget() {
      var self = _HTMLElement.call(this) || this;
      self.attachShadow({ mode: 'open' })
          .appendChild(root.content.cloneNode(true));
      return self;
    }
    HTMLViewerWidget.prototype = Object.create(_HTMLElement.prototype);
    HTMLViewerWidget.prototype.constructor = HTMLViewerWidget;

    HTMLViewerWidget.prototype.onCustomWidgetAfterUpdate = function (changed) {};
    HTMLViewerWidget.prototype.onCustomWidgetResize      = function (w, h) {};
    HTMLViewerWidget.prototype.onCustomWidgetDestroy     = function () {};

    HTMLViewerWidget.prototype.setHtml = function (html) {
      this.shadowRoot.querySelector('div').innerHTML = html;
    };
    HTMLViewerWidget.prototype.getHtml  = function () { return ''; };
    HTMLViewerWidget.prototype.loadUrl  = function (url) {};
    HTMLViewerWidget.prototype.refresh  = function () {};

    return HTMLViewerWidget;
  }(HTMLElement));

  customElements.define('com-custom-htmlviewer', HTMLViewerWidget);
}());
