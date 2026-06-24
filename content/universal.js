(()=>{

	(() => {
		if (window.__x1UniLoaded) return;
		window.__x1UniLoaded = true;
		function extractMeta() {
			chrome.runtime.sendMessage({
				type: "PAGE_EXTRACT_RESULT",
				kind: "page",
				data: {
					url: location.href,
					domain: location.hostname,
					title: document.title,
					meta: document.querySelector("meta[name=\"description\"]")?.getAttribute("content") ?? "",
					timestamp: (/* @__PURE__ */ new Date()).toISOString()
				}
			}).catch(() => {});
		}
		function extractText() {
			const text = (document.querySelector("article") || document.querySelector("[role=\"main\"]") || document.querySelector("main") || document.querySelector(".post-content") || document.querySelector(".entry-content") || document.body).innerText || "";
			if (!text || text.length < 100) return;
			chrome.runtime.sendMessage({
				type: "PAGE_CONTENT_CAPTURED",
				url: location.href,
				title: document.title,
				text: text.slice(0, 1e4),
				domain: location.hostname
			}).catch(() => {});
		}
		if (document.readyState === "complete") {
			setTimeout(extractMeta, 1500);
			setTimeout(extractText, 3e3);
		} else window.addEventListener("load", () => {
			setTimeout(extractMeta, 1500);
			setTimeout(extractText, 3e3);
		});
	})();

})()