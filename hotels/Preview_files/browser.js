/**
 * Detect whether this request would be eligible for expandable ads.
 * @param {Navigator} nav The native navigator object.
 * @param {Document} doc The document object.
 * @return {boolean} True if this browser and OS combination is fully supported.
 */
var detectBrowserEligibility = function(nav, doc) {
  var ua = nav.userAgent;
  var platform = nav.platform;
  // Only accept when OS is Windows, Mac, or Linux, and not the Opera browser
  var platformsRegexp = /Win|Mac|Linux|iPod|iPad|iPhone/;
  if (platformsRegexp.test(platform) && !/^Opera/.test(ua)) {
    // We're on a supported platform and the browser is not Opera
    var webkitVersion = (/WebKit\/(\d+)/.exec(ua) || [0, 0])[1];
    // NOTE: below we rely on an implicit conversion of the captured value
    // from this regex (when comparing to 1.7), so it is unsafe to change
    // this to capture something less number-y (such as by including the
    // revision number in addition to major and minor version).
    var geckoVersion = (/rv\:(\d+\.\d+)/.exec(ua) || [0, 0])[1];
    // Check if IE on Windows, with the Trident token, which indicates this
    // is version 8+. In compatibility mode, documentMode indicates which
    // rendering mode is used, disallow 7 and below (quirks mode) as they break
    // z-index and cross-domain communication functionality for expandables.
    if (/Win/.test(platform) && /MSIE.*Trident/.test(ua) &&
        doc.documentMode > 7) {
      // We're in a version 8+ IE browser on windows
      return true;
    // Check if matches Gecko browser with version number like rv:xx.x.x
    } else if (!webkitVersion && nav.product == 'Gecko' &&
        // Major.minor is at least 1.8 and we're not in the 1.8 or 1.8.0 case
        // Note that this breaks for 1.x where x > 9, but this is an extremely
        // small population in the logs (< 1k queries/day).
        geckoVersion > 1.7 && !/rv\:1\.8([^.]|\.0)/.test(ua)) {
      // We're in a version 1.8.1+ Gecko-based browser
      return true;
    // Check if matches WebKit with a numeric major version (WebKit/525)
    } else if (webkitVersion > 524) {
      // We're in a version 525+ WebKit-based browser
      return true;
    }
  }
  return false;
};
