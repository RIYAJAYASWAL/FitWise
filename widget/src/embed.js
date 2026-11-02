import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import widgetStyles from './styles.css?inline';
import { configureClient, sendEvent, getConfig } from './api/client';
import { getOrCreateVisitorId, getForcedVariant } from './hooks/useExperiment';

/**
 * FitWise Widget Embed Script
 *
 * Requirements:
 * - find #fitwise-widget, read data-product-id / data-api-url / data-api-key,
 * - attach a Shadow DOM root, inject the inlined CSS inside it, mount React there.
 * - Expose window.FitWise.track(type) so the store can report add_to_cart and purchase events.
 *
 * SECURITY: Only PUBLISHABLE keys ('fw_pub_...') may be used in the widget.
 */

// Active configuration from the mounted widget
let activeMountConfig = {
  productId: '',
  apiUrl: 'http://localhost:5000',
  apiKey: '',
};

function validateApiKey(apiKey) {
  if (!apiKey) {
    console.error('FitWise: Missing data-api-key. Please provide a publishable key (fw_pub_...).');
    return false;
  }
  if (apiKey.startsWith('fw_sec_')) {
    console.error(
      'FitWise Security Violation: A SECRET KEY was provided in data-api-key! Secret keys must NEVER be embedded in client-side code. Only publishable keys (fw_pub_...) are allowed.'
    );
    return false;
  }
  return true;
}

/**
 * Global track function exposed at window.FitWise.track(type, customData)
 * Allows host stores to easily report add_to_cart, purchase, and custom events.
 *
 * @param {string} type - Event type ('add_to_cart' | 'purchase' | 'widget_shown' | 'recommend_requested')
 * @param {Object} [customData] - Optional overrides { visitorId, variant, sku, apiUrl, apiKey }
 */
export async function track(type, customData = {}) {
  const visitorId =
    customData.visitorId ||
    (typeof window !== 'undefined' && window.FitWise?._currentVisitorId) ||
    getOrCreateVisitorId();

  const variant =
    customData.variant ||
    getForcedVariant() ||
    (typeof window !== 'undefined' && window.FitWise?._currentVariant) ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('fitwise_variant') : null) ||
    'control';

  const sku =
    customData.sku ||
    customData.productId ||
    (typeof window !== 'undefined' && window.FitWise?._currentSku) ||
    activeMountConfig.productId ||
    undefined;

  const apiUrl =
    customData.apiUrl ||
    activeMountConfig.apiUrl ||
    getConfig().apiUrl ||
    'http://localhost:5000';

  const apiKey =
    customData.apiKey ||
    activeMountConfig.apiKey ||
    getConfig().apiKey ||
    '';

  return sendEvent(
    {
      visitorId,
      variant,
      type,
      sku,
      timestamp: customData.timestamp || new Date().toISOString(),
      experimentId: customData.experimentId,
    },
    { apiUrl, apiKey }
  );
}

/**
 * Mounts the FitWise widget into a given container element.
 * Attaches an isolated Shadow DOM root, injects inlined CSS, and mounts React.
 *
 * @param {HTMLElement|string} target - Container element or selector (e.g. '#fitwise-widget')
 * @param {Object} [overrideConfig]
 */
export function mountWidget(target, overrideConfig = {}) {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!container || container._fitwise_mounted) return;
  container._fitwise_mounted = true;

  const currentScript = document.currentScript;

  const productId =
    overrideConfig.productId ||
    container.getAttribute('data-product-id') ||
    currentScript?.getAttribute('data-product-id') ||
    '';

  const apiUrl =
    overrideConfig.apiUrl ||
    container.getAttribute('data-api-url') ||
    currentScript?.getAttribute('data-api-url') ||
    'http://localhost:5000';

  const apiKey =
    overrideConfig.apiKey ||
    container.getAttribute('data-api-key') ||
    currentScript?.getAttribute('data-api-key') ||
    '';

  if (!validateApiKey(apiKey)) {
    return;
  }

  // Save active mount config
  activeMountConfig = { productId, apiUrl, apiKey };

  // Sync with API client configuration
  configureClient({ apiUrl, apiKey });

  // Attach isolated Shadow DOM to prevent host page CSS collisions
  const shadow = container.shadowRoot || container.attachShadow({ mode: 'open' });

  // Inject inlined CSS inside the Shadow DOM root
  const styleEl = document.createElement('style');
  styleEl.textContent = widgetStyles;
  shadow.appendChild(styleEl);

  // Mount React Root inside the Shadow DOM
  const mountEl = document.createElement('div');
  mountEl.className = 'fitwise-widget-host';
  shadow.appendChild(mountEl);

  const root = createRoot(mountEl);
  root.render(
    React.createElement(
      React.StrictMode,
      null,
      React.createElement(App, {
        productId,
        apiUrl,
        apiKey,
        inline: container.getAttribute('data-inline') === 'true' || Boolean(overrideConfig.inline),
        defaultOpen: container.getAttribute('data-open') === 'true' || Boolean(overrideConfig.defaultOpen),
        forcedVariant:
          overrideConfig.forcedVariant ||
          container.getAttribute('data-variant') ||
          undefined,
      })
    )
  );

  return { root, shadow };
}

/**
 * Auto-initializes #fitwise-widget and any widget containers on the page.
 */
export function initAll() {
  // 1. Primary target requested: #fitwise-widget
  const primary = document.getElementById('fitwise-widget');
  if (primary && !primary._fitwise_mounted) {
    mountWidget(primary);
  }

  // 2. Any additional tagged containers
  const targets = document.querySelectorAll(
    '[data-fitwise-widget], [data-product-id]:not([data-fitwise-ignore])'
  );

  targets.forEach((el) => {
    if (el.id !== 'fitwise-widget' && !el._fitwise_mounted) {
      if (el.hasAttribute('data-api-key') || el.hasAttribute('data-fitwise-widget')) {
        mountWidget(el);
      }
    }
  });
}

// Expose window.FitWise immediately when script evaluates
if (typeof window !== 'undefined') {
  window.FitWise = window.FitWise || {};
  window.FitWise.init = initAll;
  window.FitWise.mount = mountWidget;
  window.FitWise.track = track;
  window.FitWise.version = '1.0.0';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
}

export default mountWidget;
