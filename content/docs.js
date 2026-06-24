(()=>{

	(() => {
		if (window.__x1DocsLoaded) return;
		window.__x1DocsLoaded = true;
		function send(action, data) {
			chrome.runtime.sendMessage({
				type: "PAGE_EXTRACT_RESULT",
				kind: "docs",
				data: {
					action,
					...data,
					url: location.href,
					timestamp: (/* @__PURE__ */ new Date()).toISOString()
				}
			}).catch(() => {});
		}
		function extractDocInfo() {
			const title = document.querySelector("[role=\"heading\"][aria-level=\"1\"]")?.textContent?.trim() ?? document.title.replace(" - Google Docs", "").trim();
			const body = (document.querySelector(".kix-page-content-wrapper") ?? document.querySelector(".docs-texteventtarget-iframe"))?.textContent?.trim().slice(0, 3e3) ?? "";
			return {
				title,
				body,
				wordCount: body ? body.split(/\s+/).length : 0,
				lastSaved: document.querySelector("#docs-title-workspace .docs-title-save-indicator-label")?.textContent?.trim() ?? "",
				mode: document.querySelector("#docs-editor") ? "editing" : "viewing"
			};
		}
		let lastId = "";
		function check() {
			const info = extractDocInfo();
			if (!info.title) return;
			const id = `${info.title}::${info.wordCount}`;
			if (id !== lastId) {
				lastId = id;
				send(info.mode === "editing" ? "editing" : "viewing", info);
			}
		}
		function start() {
			const target = document.querySelector(".kix-appview-editor") ?? document.body;
			new MutationObserver(() => check()).observe(target, {
				childList: true,
				subtree: true,
				characterData: true
			});
			check();
		}
		const wait = setInterval(() => {
			if (document.querySelector(".kix-appview-editor") || document.querySelector(".docs-texteventtarget-iframe")) {
				clearInterval(wait);
				start();
			}
		}, 1e3);
		setTimeout(() => clearInterval(wait), 3e4);
	})();

})()