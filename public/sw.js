/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./public/service-worker.js":
/*!**********************************!*\
  !*** ./public/service-worker.js ***!
  \**********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval(__webpack_require__.ts("// Custom Service Worker with Push Notifications Support\n// OPTIMIZED: Minimal size for fast initialization\nconsole.log('[Service Worker] Letify SW starting...');\n// Precache manifest - will be injected by next-pwa during build\n[];\n// Skip waiting - activate immediately\nself.skipWaiting();\n// ========== PUSH NOTIFICATION HANDLERS ========== \n// These are CRITICAL and must respond quickly to prevent timeout\n// Push Event Handler - MUST be synchronous and fast\nself.addEventListener('push', function(event) {\n    console.log('[SW] Push event received');\n    let notificationData = {\n        title: 'Letify Notification',\n        body: 'You have a new notification',\n        icon: '/icons/Logo/192.png',\n        badge: '/icons/Logo/96.png',\n        tag: 'letify-notification',\n        data: {},\n        requireInteraction: false,\n        vibrate: [\n            200,\n            100,\n            200\n        ]\n    };\n    // Parse push notification payload\n    if (event.data) {\n        try {\n            const payload = event.data.json();\n            notificationData = {\n                title: payload.title || notificationData.title,\n                body: payload.body || notificationData.body,\n                icon: payload.icon || notificationData.icon,\n                badge: payload.badge || notificationData.badge,\n                tag: payload.tag || notificationData.tag,\n                data: payload.data || {},\n                requireInteraction: payload.requireInteraction || false,\n                vibrate: payload.vibrate || notificationData.vibrate,\n                actions: payload.actions || []\n            };\n        } catch (e) {\n            console.error('[SW] Error parsing push:', e);\n            if (event.data && event.data.text) {\n                notificationData.body = event.data.text();\n            }\n        }\n    }\n    // Show notification\n    const promiseChain = self.registration.showNotification(notificationData.title, {\n        body: notificationData.body,\n        icon: notificationData.icon,\n        badge: notificationData.badge,\n        tag: notificationData.tag,\n        data: notificationData.data,\n        requireInteraction: notificationData.requireInteraction,\n        vibrate: notificationData.vibrate,\n        actions: notificationData.actions,\n        renotify: true,\n        timestamp: Date.now()\n    });\n    event.waitUntil(promiseChain);\n});\n// Notification Click Handler\nself.addEventListener('notificationclick', function(event) {\n    var _event_notification_data;\n    console.log('[SW] Notification clicked');\n    event.notification.close();\n    const urlToOpen = ((_event_notification_data = event.notification.data) === null || _event_notification_data === void 0 ? void 0 : _event_notification_data.url) || '/dashboard';\n    const promiseChain = clients.matchAll({\n        type: 'window',\n        includeUncontrolled: true\n    }).then(function(clientList) {\n        // Focus existing window\n        for(let i = 0; i < clientList.length; i++){\n            const client = clientList[i];\n            if ('focus' in client) {\n                return client.focus().then(()=>{\n                    if ('navigate' in client) {\n                        return client.navigate(urlToOpen);\n                    }\n                });\n            }\n        }\n        // Open new window if none found\n        if (clients.openWindow) {\n            return clients.openWindow(urlToOpen);\n        }\n    });\n    event.waitUntil(promiseChain);\n});\n// Push Subscription Change Handler\nself.addEventListener('pushsubscriptionchange', function(event) {\n    console.log('[SW] Push subscription changed');\n// Client-side handles resubscription\n});\n// Activate event\nself.addEventListener('activate', (event)=>{\n    console.log('[SW] Activated');\n    event.waitUntil(clients.claim());\n});\nconsole.log('[Service Worker] ✅ Letify SW initialized - Push Notifications ready');\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                /* unsupported import.meta.webpackHot */ undefined.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QyxNQUFNRSxTQUFTSCxVQUFVLENBQUNDLEVBQUU7WUFDNUIsSUFBSSxXQUFXRSxRQUFRO2dCQUNyQixPQUFPQSxPQUFPQyxLQUFLLEdBQUdMLElBQUksQ0FBQztvQkFDekIsSUFBSSxjQUFjSSxRQUFRO3dCQUN4QixPQUFPQSxPQUFPRSxRQUFRLENBQUNaO29CQUN6QjtnQkFDRjtZQUNGO1FBQ0Y7UUFFQSxnQ0FBZ0M7UUFDaEMsSUFBSUUsUUFBUVcsVUFBVSxFQUFFO1lBQ3RCLE9BQU9YLFFBQVFXLFVBQVUsQ0FBQ2I7UUFDNUI7SUFDRjtJQUVBMUIsTUFBTXVCLFNBQVMsQ0FBQ1A7QUFDbEI7QUFFQSxtQ0FBbUM7QUFDbkNwQixLQUFLRyxnQkFBZ0IsQ0FBQywwQkFBMEIsU0FBU0MsS0FBSztJQUM1RE4sUUFBUUMsR0FBRyxDQUFDO0FBQ1oscUNBQXFDO0FBQ3ZDO0FBRUEsaUJBQWlCO0FBQ2pCQyxLQUFLRyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUNDO0lBQ2pDTixRQUFRQyxHQUFHLENBQUM7SUFDWkssTUFBTXVCLFNBQVMsQ0FBQ0ssUUFBUVksS0FBSztBQUMvQjtBQUVBOUMsUUFBUUMsR0FBRyxDQUFDIiwic291cmNlcyI6WyJEOlxcTGV0aWZ5X0ZyZXNoXFxMZXRpZnlfU3RhcnRlcl9LaXRfdjBcXHB1YmxpY1xcc2VydmljZS13b3JrZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ3VzdG9tIFNlcnZpY2UgV29ya2VyIHdpdGggUHVzaCBOb3RpZmljYXRpb25zIFN1cHBvcnRcclxuLy8gT1BUSU1JWkVEOiBNaW5pbWFsIHNpemUgZm9yIGZhc3QgaW5pdGlhbGl6YXRpb25cclxuXHJcbmNvbnNvbGUubG9nKCdbU2VydmljZSBXb3JrZXJdIExldGlmeSBTVyBzdGFydGluZy4uLicpO1xyXG5cclxuLy8gUHJlY2FjaGUgbWFuaWZlc3QgLSB3aWxsIGJlIGluamVjdGVkIGJ5IG5leHQtcHdhIGR1cmluZyBidWlsZFxyXG5zZWxmLl9fV0JfTUFOSUZFU1Q7XHJcblxyXG4vLyBTa2lwIHdhaXRpbmcgLSBhY3RpdmF0ZSBpbW1lZGlhdGVseVxyXG5zZWxmLnNraXBXYWl0aW5nKCk7XHJcblxyXG4vLyA9PT09PT09PT09IFBVU0ggTk9USUZJQ0FUSU9OIEhBTkRMRVJTID09PT09PT09PT0gXHJcbi8vIFRoZXNlIGFyZSBDUklUSUNBTCBhbmQgbXVzdCByZXNwb25kIHF1aWNrbHkgdG8gcHJldmVudCB0aW1lb3V0XHJcblxyXG4vLyBQdXNoIEV2ZW50IEhhbmRsZXIgLSBNVVNUIGJlIHN5bmNocm9ub3VzIGFuZCBmYXN0XHJcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcigncHVzaCcsIGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgY29uc29sZS5sb2coJ1tTV10gUHVzaCBldmVudCByZWNlaXZlZCcpO1xyXG4gIFxyXG4gIGxldCBub3RpZmljYXRpb25EYXRhID0ge1xyXG4gICAgdGl0bGU6ICdMZXRpZnkgTm90aWZpY2F0aW9uJyxcclxuICAgIGJvZHk6ICdZb3UgaGF2ZSBhIG5ldyBub3RpZmljYXRpb24nLFxyXG4gICAgaWNvbjogJy9pY29ucy9Mb2dvLzE5Mi5wbmcnLFxyXG4gICAgYmFkZ2U6ICcvaWNvbnMvTG9nby85Ni5wbmcnLFxyXG4gICAgdGFnOiAnbGV0aWZ5LW5vdGlmaWNhdGlvbicsXHJcbiAgICBkYXRhOiB7fSxcclxuICAgIHJlcXVpcmVJbnRlcmFjdGlvbjogZmFsc2UsXHJcbiAgICB2aWJyYXRlOiBbMjAwLCAxMDAsIDIwMF0sXHJcbiAgfTtcclxuXHJcbiAgLy8gUGFyc2UgcHVzaCBub3RpZmljYXRpb24gcGF5bG9hZFxyXG4gIGlmIChldmVudC5kYXRhKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBwYXlsb2FkID0gZXZlbnQuZGF0YS5qc29uKCk7XHJcbiAgICAgIG5vdGlmaWNhdGlvbkRhdGEgPSB7XHJcbiAgICAgICAgdGl0bGU6IHBheWxvYWQudGl0bGUgfHwgbm90aWZpY2F0aW9uRGF0YS50aXRsZSxcclxuICAgICAgICBib2R5OiBwYXlsb2FkLmJvZHkgfHwgbm90aWZpY2F0aW9uRGF0YS5ib2R5LFxyXG4gICAgICAgIGljb246IHBheWxvYWQuaWNvbiB8fCBub3RpZmljYXRpb25EYXRhLmljb24sXHJcbiAgICAgICAgYmFkZ2U6IHBheWxvYWQuYmFkZ2UgfHwgbm90aWZpY2F0aW9uRGF0YS5iYWRnZSxcclxuICAgICAgICB0YWc6IHBheWxvYWQudGFnIHx8IG5vdGlmaWNhdGlvbkRhdGEudGFnLFxyXG4gICAgICAgIGRhdGE6IHBheWxvYWQuZGF0YSB8fCB7fSxcclxuICAgICAgICByZXF1aXJlSW50ZXJhY3Rpb246IHBheWxvYWQucmVxdWlyZUludGVyYWN0aW9uIHx8IGZhbHNlLFxyXG4gICAgICAgIHZpYnJhdGU6IHBheWxvYWQudmlicmF0ZSB8fCBub3RpZmljYXRpb25EYXRhLnZpYnJhdGUsXHJcbiAgICAgICAgYWN0aW9uczogcGF5bG9hZC5hY3Rpb25zIHx8IFtdXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tTV10gRXJyb3IgcGFyc2luZyBwdXNoOicsIGUpO1xyXG4gICAgICBpZiAoZXZlbnQuZGF0YSAmJiBldmVudC5kYXRhLnRleHQpIHtcclxuICAgICAgICBub3RpZmljYXRpb25EYXRhLmJvZHkgPSBldmVudC5kYXRhLnRleHQoKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gU2hvdyBub3RpZmljYXRpb25cclxuICBjb25zdCBwcm9taXNlQ2hhaW4gPSBzZWxmLnJlZ2lzdHJhdGlvbi5zaG93Tm90aWZpY2F0aW9uKFxyXG4gICAgbm90aWZpY2F0aW9uRGF0YS50aXRsZSxcclxuICAgIHtcclxuICAgICAgYm9keTogbm90aWZpY2F0aW9uRGF0YS5ib2R5LFxyXG4gICAgICBpY29uOiBub3RpZmljYXRpb25EYXRhLmljb24sXHJcbiAgICAgIGJhZGdlOiBub3RpZmljYXRpb25EYXRhLmJhZGdlLFxyXG4gICAgICB0YWc6IG5vdGlmaWNhdGlvbkRhdGEudGFnLFxyXG4gICAgICBkYXRhOiBub3RpZmljYXRpb25EYXRhLmRhdGEsXHJcbiAgICAgIHJlcXVpcmVJbnRlcmFjdGlvbjogbm90aWZpY2F0aW9uRGF0YS5yZXF1aXJlSW50ZXJhY3Rpb24sXHJcbiAgICAgIHZpYnJhdGU6IG5vdGlmaWNhdGlvbkRhdGEudmlicmF0ZSxcclxuICAgICAgYWN0aW9uczogbm90aWZpY2F0aW9uRGF0YS5hY3Rpb25zLFxyXG4gICAgICByZW5vdGlmeTogdHJ1ZSxcclxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG4gICAgfVxyXG4gICk7XHJcblxyXG4gIGV2ZW50LndhaXRVbnRpbChwcm9taXNlQ2hhaW4pO1xyXG59KTtcclxuXHJcbi8vIE5vdGlmaWNhdGlvbiBDbGljayBIYW5kbGVyXHJcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcignbm90aWZpY2F0aW9uY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xyXG4gIGNvbnNvbGUubG9nKCdbU1ddIE5vdGlmaWNhdGlvbiBjbGlja2VkJyk7XHJcbiAgZXZlbnQubm90aWZpY2F0aW9uLmNsb3NlKCk7XHJcblxyXG4gIGNvbnN0IHVybFRvT3BlbiA9IGV2ZW50Lm5vdGlmaWNhdGlvbi5kYXRhPy51cmwgfHwgJy9kYXNoYm9hcmQnO1xyXG4gIFxyXG4gIGNvbnN0IHByb21pc2VDaGFpbiA9IGNsaWVudHMubWF0Y2hBbGwoe1xyXG4gICAgdHlwZTogJ3dpbmRvdycsXHJcbiAgICBpbmNsdWRlVW5jb250cm9sbGVkOiB0cnVlXHJcbiAgfSkudGhlbihmdW5jdGlvbihjbGllbnRMaXN0KSB7XHJcbiAgICAvLyBGb2N1cyBleGlzdGluZyB3aW5kb3dcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY2xpZW50TGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBjbGllbnQgPSBjbGllbnRMaXN0W2ldO1xyXG4gICAgICBpZiAoJ2ZvY3VzJyBpbiBjbGllbnQpIHtcclxuICAgICAgICByZXR1cm4gY2xpZW50LmZvY3VzKCkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICBpZiAoJ25hdmlnYXRlJyBpbiBjbGllbnQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGNsaWVudC5uYXZpZ2F0ZSh1cmxUb09wZW4pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIE9wZW4gbmV3IHdpbmRvdyBpZiBub25lIGZvdW5kXHJcbiAgICBpZiAoY2xpZW50cy5vcGVuV2luZG93KSB7XHJcbiAgICAgIHJldHVybiBjbGllbnRzLm9wZW5XaW5kb3codXJsVG9PcGVuKTtcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgZXZlbnQud2FpdFVudGlsKHByb21pc2VDaGFpbik7XHJcbn0pO1xyXG5cclxuLy8gUHVzaCBTdWJzY3JpcHRpb24gQ2hhbmdlIEhhbmRsZXJcclxuc2VsZi5hZGRFdmVudExpc3RlbmVyKCdwdXNoc3Vic2NyaXB0aW9uY2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcclxuICBjb25zb2xlLmxvZygnW1NXXSBQdXNoIHN1YnNjcmlwdGlvbiBjaGFuZ2VkJyk7XHJcbiAgLy8gQ2xpZW50LXNpZGUgaGFuZGxlcyByZXN1YnNjcmlwdGlvblxyXG59KTtcclxuXHJcbi8vIEFjdGl2YXRlIGV2ZW50XHJcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcignYWN0aXZhdGUnLCAoZXZlbnQpID0+IHtcclxuICBjb25zb2xlLmxvZygnW1NXXSBBY3RpdmF0ZWQnKTtcclxuICBldmVudC53YWl0VW50aWwoY2xpZW50cy5jbGFpbSgpKTtcclxufSk7XHJcblxyXG5jb25zb2xlLmxvZygnW1NlcnZpY2UgV29ya2VyXSDinIUgTGV0aWZ5IFNXIGluaXRpYWxpemVkIC0gUHVzaCBOb3RpZmljYXRpb25zIHJlYWR5Jyk7XHJcbiJdLCJuYW1lcyI6WyJjb25zb2xlIiwibG9nIiwic2VsZiIsIl9fV0JfTUFOSUZFU1QiLCJza2lwV2FpdGluZyIsImFkZEV2ZW50TGlzdGVuZXIiLCJldmVudCIsIm5vdGlmaWNhdGlvbkRhdGEiLCJ0aXRsZSIsImJvZHkiLCJpY29uIiwiYmFkZ2UiLCJ0YWciLCJkYXRhIiwicmVxdWlyZUludGVyYWN0aW9uIiwidmlicmF0ZSIsInBheWxvYWQiLCJqc29uIiwiYWN0aW9ucyIsImUiLCJlcnJvciIsInRleHQiLCJwcm9taXNlQ2hhaW4iLCJyZWdpc3RyYXRpb24iLCJzaG93Tm90aWZpY2F0aW9uIiwicmVub3RpZnkiLCJ0aW1lc3RhbXAiLCJEYXRlIiwibm93Iiwid2FpdFVudGlsIiwibm90aWZpY2F0aW9uIiwiY2xvc2UiLCJ1cmxUb09wZW4iLCJ1cmwiLCJjbGllbnRzIiwibWF0Y2hBbGwiLCJ0eXBlIiwiaW5jbHVkZVVuY29udHJvbGxlZCIsInRoZW4iLCJjbGllbnRMaXN0IiwiaSIsImxlbmd0aCIsImNsaWVudCIsImZvY3VzIiwibmF2aWdhdGUiLCJvcGVuV2luZG93IiwiY2xhaW0iXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./public/service-worker.js\n"));

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			if (cachedModule.error !== undefined) throw cachedModule.error;
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/trusted types policy */
/******/ 	(() => {
/******/ 		var policy;
/******/ 		__webpack_require__.tt = () => {
/******/ 			// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.
/******/ 			if (policy === undefined) {
/******/ 				policy = {
/******/ 					createScript: (script) => (script)
/******/ 				};
/******/ 				if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {
/******/ 					policy = trustedTypes.createPolicy("nextjs#bundler", policy);
/******/ 				}
/******/ 			}
/******/ 			return policy;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script */
/******/ 	(() => {
/******/ 		__webpack_require__.ts = (script) => (__webpack_require__.tt().createScript(script));
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/react refresh */
/******/ 	(() => {
/******/ 		if (__webpack_require__.i) {
/******/ 		__webpack_require__.i.push((options) => {
/******/ 			const originalFactory = options.factory;
/******/ 			options.factory = (moduleObject, moduleExports, webpackRequire) => {
/******/ 				const hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;
/******/ 				const cleanup = hasRefresh ? self.$RefreshInterceptModuleExecution$(moduleObject.id) : () => {};
/******/ 				try {
/******/ 					originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
/******/ 				} finally {
/******/ 					cleanup();
/******/ 				}
/******/ 			}
/******/ 		})
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	
/******/ 	// noop fns to prevent runtime errors during initialization
/******/ 	if (typeof self !== "undefined") {
/******/ 		self.$RefreshReg$ = function () {};
/******/ 		self.$RefreshSig$ = function () {
/******/ 			return function (type) {
/******/ 				return type;
/******/ 			};
/******/ 		};
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval-source-map devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./public/service-worker.js");
/******/ 	
/******/ })()
;