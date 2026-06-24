(()=>{

	(() => {
		if (window.__x1SheetsLoaded) return;
		window.__x1SheetsLoaded = true;
		function send(action, data) {
			chrome.runtime.sendMessage({
				type: "PAGE_EXTRACT_RESULT",
				kind: "sheets",
				data: {
					action,
					...data,
					url: location.href,
					timestamp: (/* @__PURE__ */ new Date()).toISOString()
				}
			}).catch(() => {});
		}
		function extractSheetInfo() {
			return {
				title: document.querySelector("[role=\"heading\"][aria-level=\"1\"]")?.textContent?.trim() ?? document.title.replace(" - Google Sheets", "").trim(),
				sheetCount: document.querySelectorAll("#sheet-tab-bar .docs-sheet-tab").length,
				activeSheet: document.querySelector("#sheet-tab-bar .docs-sheet-active-tab")?.textContent?.trim() ?? "",
				selectedCell: document.querySelector("#t-formula-bar-input")?.textContent?.trim() ?? "",
				lastSaved: document.querySelector("#docs-title-workspace .docs-title-save-indicator-label")?.textContent?.trim() ?? ""
			};
		}
		let lastId = "";
		function check() {
			const info = extractSheetInfo();
			if (!info.title) return;
			const id = `${info.title}::${info.activeSheet}`;
			if (id !== lastId) {
				lastId = id;
				send("editing", info);
			}
		}
		function start() {
			const target = document.querySelector("#sheet-container") ?? document.body;
			new MutationObserver(() => check()).observe(target, {
				childList: true,
				subtree: true
			});
			check();
		}
		const wait = setInterval(() => {
			if (document.querySelector("#sheet-container") || document.querySelector("#sheets-editor")) {
				clearInterval(wait);
				start();
			}
		}, 1e3);
		setTimeout(() => clearInterval(wait), 3e4);
	})();

})()