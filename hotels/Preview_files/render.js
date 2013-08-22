/**
 * Function to check browser compatibility and unhide a warning element if
 * incompatible.
 * @param {string} warningElementId The element ID to unhide if browser is
 *     incompatible.
 */
function warnOnIncompatibleBrowser(warningElementId) {
  var requestEligible = detectBrowserEligibility(window.navigator,
      window.document);

  if (!requestEligible) {
    var warningElement = document.getElementById(warningElementId);
    if (warningElement && warningElement.style) {
      warningElement.style.display = '';
    }
  }
}


/**
 * Function to update the CSS classes of the rendering controls based on which
 * slot is currently rendered, based on the render_ad_slot query param.
 * @param {string} slot A string representing the numbered ad slot that's
 *     currently rendered, or 'all'.
 */
function styleRenderingControls(slot) {
  var renderedCssClass = 'rendered-adslot';
  var controls = document.querySelector('.rendering-controls');

  // Check for browser support to adjust CSS classes, don't bother if support
  // isn't present, as this isn't critical to the demo.
  if (!document.body.classList) {
    return;
  }

  if (slot === 'all') {
    // Apply the appropriate CSS class to all the adslot divs.
    var allSlots = controls.querySelectorAll('div.adslot');
    for (var i = 0; i < allSlots.length; ++i) {
      allSlots[i].classList.add(renderedCssClass);
    }
  } else {
    var slotNum = Number(slot);
    if (slotNum === NaN) {
      return;
    }

    // Apply the appropriate CSS class to the proper adslot div.
    controls.querySelector('a:nth-child(' + slotNum +
                           ') div.adslot').classList.add(renderedCssClass);
  }
}


/**
 * Adds a prod_js toggle link to the rendering controls.
 * @param {string} id The ID of the element for which to add the toggle link.
 */
function addProdJsToggleToControls(id) {
  var el = document.getElementById(id);
  if (!el) {
    return;
  }

  // Get current value.
  var matches = window.location.search.match(/&prod_js=(\d)/);
  var prodJs = matches ? parseInt(matches[1]) : 1;
  var link = document.createElement('a');
  link.href = window.location.href;
  link.href = matches ? link.href.replace(/prod_js=\d/, 'prod_js=' + (1 -
        prodJs)) : link.href + '&prod_js=' + (1 - prodJs);
  link.textContent = prodJs ? 'staging' : 'production';

  if (prodJs) {
    el.innerHTML = link.outerHTML + ' | production ';
  } else {
    el.innerHTML = 'staging | ' + link.outerHTML;

    // Apply a body style to indicate staging.
    document.body.classList.add('staging');
    var title = document.getElementById('title');
    if (title) {
      title.textContent = title.textContent + ' (STAGING)';
    }

    // Link to the README indicating what's different in staging.
    el.innerHTML += '<br /><br /><a href="' + RENDERING_PARAMS.server +
        '/static/README-staging.html" target="_blank">staging changelog</a>';
  }
}


/**
 * Helper function to write the tag into the provided document.
 * @param {!Document} doc The document in which the write the provided ad tag.
 * @param {string} tag The ad content.
 */
function writeAdTag(doc, tag) {
  // Explicitly call open/write/close functions for any browsers that require
  // those calls to work propertly.
  doc.open('text/html', 'replace');
  doc.write(tag);
  doc.close();
}


/**
 * Helper function to write ad content for in-page rendering.
 * @param {string} scriptAdTag The markup containing a script tag that renders
 *     the ad content directly.
 */
function writeAdWithInPageRendering(scriptAdTag) {
  writeAdTag(document, scriptAdTag);
}


/**
 * Helper function to write ad content for the AdSense API used in a
 * cross-domain environment.
 * @param {string} adUrl The URL that loads the ad content from the demo tag
 *     server.
 */
function writeAdWithAdSenseIframe(adUrl) {
  window.google_ad_width = RENDERING_PARAMS.width;
  window.google_ad_height = RENDERING_PARAMS.height;
  window.google_ad_url = adUrl;
  tag = '<script src="' + RENDERING_PARAMS.server + '/show_expandable_ads.js' +
      '?prod_js=' + RENDERING_PARAMS.prodJs + '"><\/script>';
  writeAdTag(document, tag);
}


/**
 * Helper function to write ad content for the AdSense API used in a
 * friendly-iframe environment.
 * @param {!Element} parentElement The parent element into which to write the
 *     friendly iframe.
 * @param {string} scriptAdTag The markup containing a script tag that renders
 *     the ad content directly.
 */
function writeAdWithFriendlyIframe(parentElement, scriptAdTag) {
  var sdcPath =
      '//pagead2.googlesyndication.com/pagead/sdc_expansion_embed.js';
  if (!RENDERING_PARAMS.prodJs) {
    sdcPath = RENDERING_PARAMS.server + '/static/sdc_expansion_embed.js';
  }
  var sameDomainExpansionJs = '<script src="' + sdcPath + '"></scr' +
      'ipt>';

  var iframeContents = '<!doctype html><html><head>' +
      '<script>IN_ADSENSE_IFRAME = true;<\/script>' +
      sameDomainExpansionJs +
      '<\/head><body>' +
      scriptAdTag + '<\/body><\/html>';
  var iframe = document.createElement('iframe');
  iframe.width = RENDERING_PARAMS.width;
  iframe.height = RENDERING_PARAMS.height;
  iframe.allowTransparency = 'true';
  iframe.scrolling = 'no';
  iframe.marginWidth = '0';
  iframe.marginHeight = '0';
  iframe.frameBorder = '0';
  iframe.style.border = '0';

  parentElement.appendChild(iframe);
  iframeDoc = iframe.contentWindow ?
      iframe.contentWindow.document : iframe.contentDocument;

  // If IE, use the src trick to ensure the content inside the iframe loads
  // properly. See contentads/frontend/js/gam/gut/html_util.js.
  if (/MSIE/.test(window.navigator.userAgent)) {
    // Note that any unicode ad content will need to be escaped here, probably
    // necessary for HTML5 ads. See http://b/issue?id=5634227.
    iframe.contentWindow.contents = iframeContents;
    iframe.src = 'javascript:window["contents"]';
  } else {
    writeAdTag(iframeDoc, iframeContents);
  }
}


/**
 * Helper function to write an unfriendly iframe that contains no AdSense API
 * libraries, forcing the creative to fall back on iframe buster files.
 * @param {string} adUrl The URL that loads the ad content from the demo tag
 *     server.
 */
function writeAdWithIframeBusterIframe(adUrl) {
  var tag = '<iframe width=' + RENDERING_PARAMS.width + ' height=' +
      RENDERING_PARAMS.height + ' src="' + adUrl + '"></iframe>';
  writeAdTag(document, tag);
}


/**
 * Helper run for each ad slot to render the ad in the mode requested.
 * @param {string} parentId ID of the parent element in which we are called,
 *     used primarily to inject a friendly iframe dynamically.
 * @param {number|string} slotNum Which ad slot to render with the real ad
 *     instead of a placeholder image.
 */
function renderAdContent(parentId, slotNum) {
  // Displays Latin character placeholder image in place of ad for development
  // layout purposes.
  // Intentionally use != comparing query param (string) to slotNum (number).
  var placeholder_img = RENDERING_PARAMS.renderAdSlot !== 'all' &&
      RENDERING_PARAMS.renderAdSlot != slotNum;

  if (placeholder_img) {
    document.write('<img src="static/black_' + RENDERING_PARAMS.width + 'x' +
        RENDERING_PARAMS.height + '.gif" width="' + RENDERING_PARAMS.width +
        '" height="' + RENDERING_PARAMS.height + '" alt="placeholder text">');
    return;
  }

  var adParams = 'tag_id=' + RENDERING_PARAMS.tagId +
                 '&prod_js=' + RENDERING_PARAMS.prodJs +
                 '&xsc=' + RENDERING_PARAMS.xsc +
                 '&width=' + RENDERING_PARAMS.width +
                 '&height=' + RENDERING_PARAMS.height +
                 '&creative_toolset_config=' +
                     RENDERING_PARAMS.creativeToolsetConfig +
                 '&engagement_notifier=' + RENDERING_PARAMS.engagementNotifier;
  var scriptAdTag = '<script src="' + RENDERING_PARAMS.server +
      '/write_ad_tag.js?' + adParams + '"><\/script>';
  var iframeAdUrl = RENDERING_PARAMS.server + '/render_ad_tag?' + adParams;

  switch (RENDERING_PARAMS.xsc) {
    case 'InPageRendering':
      writeAdWithInPageRendering(scriptAdTag);
      break;
    case 'AdSenseAPI':
      writeAdWithAdSenseIframe(iframeAdUrl);
      break;
    case 'FriendlyIframe':
      var parentElement = document.getElementById(parentId);
      writeAdWithFriendlyIframe(parentElement, scriptAdTag);
      break;
    case 'IframeBuster':
      writeAdWithIframeBusterIframe(iframeAdUrl);
      break;
    default:
      writeAdTag(document, 'Unsupported rendering mode.');
  }
}


/**
 * Helper to add/replace the render_ad_slot query parameter in the current URL.
 * Reloads the page with the proper render_ad_slot key-value pair.
 * @param {number|string} slot The numbered ad slot to render, or 'all'.
 */
function renderSlot(slot) {
  // Validate the slot parameter.
  if (slot !== 'all' && typeof slot !== 'number') {
    return;
  }

  var url = window.location.href;
  var renderAdSlotParam = '&render_ad_slot=' + slot;
  var newUrl;
  if (/&render_ad_slot=/.test(url)) {
    newUrl = url.replace(/&render_ad_slot=[^\&]+/, renderAdSlotParam);
  } else {
    newUrl = url + renderAdSlotParam;
  }

  if (newUrl && newUrl !== url) {
    window.location.href = newUrl;
  }
}
