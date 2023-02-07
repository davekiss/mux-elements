import { globalThis, document } from 'shared-polyfills';
import { getMuxUploaderEl } from './utils/element-utils';

const template = document.createElement('template');

template.innerHTML = `
<style>
</style>

<div class="item">
    <mux-uploader-sr-text></mux-uploader-sr-text>
    <mux-uploader-status></mux-uploader-status>
    <mux-uploader-retry></mux-uploader-retry>
    <mux-uploader-progress type="percentage"></mux-uploader-progress>
    <mux-uploader-progress></mux-uploader-progress>
</div>
`;

class MuxUploaderItemElement extends globalThis.HTMLElement {
  item: HTMLElement | null | undefined;
  #uploaderEl: HTMLElement | null | undefined;
  #controller: AbortController | undefined;

  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(template.content.cloneNode(true));

    this.item = this.shadowRoot?.getElementById('item');
  }

  connectedCallback() {
    this.#uploaderEl = getMuxUploaderEl(this);
    this.#controller = new AbortController();

    if (this.#uploaderEl) {
      this.#uploaderEl.addEventListener('success', this.updateText.bind(this));
    }
  }

  disconnectedCallback() {
    if (this.#uploaderEl) {
      this.#controller?.abort();
    }
  }
}

if (!globalThis.customElements.get('mux-uploader-item')) {
  globalThis.customElements.define('mux-uploader-item', MuxUploaderItemElement);
}

export default MuxUploaderItemElement;
