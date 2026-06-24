(()=>{

	(() => {
		if (window.__x1MeetLoaded) return;
		window.__x1MeetLoaded = true;
		function send(action, data) {
			chrome.runtime.sendMessage({
				type: "PAGE_EXTRACT_RESULT",
				kind: "meet",
				data: {
					action,
					...data,
					url: location.href,
					timestamp: (/* @__PURE__ */ new Date()).toISOString()
				}
			}).catch(() => {});
		}
		function extractMeetInfo() {
			const title = document.querySelector("[data-meeting-title]")?.textContent?.trim() ?? document.title.replace(" - Google Meet", "").trim();
			const participantCountEl = document.querySelector("[data-participant-count]");
			const participantCountEl2 = document.querySelector(".uGOf1d");
			let participantCount = 0;
			if (participantCountEl) participantCount = parseInt(participantCountEl.getAttribute("data-participant-count") || "0", 10);
			else if (participantCountEl2) {
				const match = participantCountEl2.textContent?.match(/(\d+)/);
				if (match) participantCount = parseInt(match[1], 10);
			}
			const micOn = document.querySelector("[aria-label*=\"micrófono\" i][data-is-muted=\"false\"], [aria-label*=\"microphone\" i][data-is-muted=\"false\"]") !== null;
			const cameraOn = document.querySelector("[aria-label*=\"cámara\" i][data-is-muted=\"false\"], [aria-label*=\"camera\" i][data-is-muted=\"false\"]") !== null;
			const captionsOn = document.querySelector("[aria-label*=\"subtítulos\" i][aria-pressed=\"true\"], [aria-label*=\"captions\" i][aria-pressed=\"true\"]") !== null;
			const inCall = document.querySelector("[data-meeting-title]") !== null || participantCount > 0;
			return {
				title,
				participantCount,
				micOn,
				cameraOn,
				captionsOn,
				inCall
			};
		}
		let lastId = "";
		function check() {
			const info = extractMeetInfo();
			const id = `${info.inCall}::${info.participantCount}`;
			if (id !== lastId) {
				lastId = id;
				if (info.inCall) send("in_call", info);
				else send("lobby", info);
			}
		}
		function start() {
			const target = document.body;
			new MutationObserver(() => setTimeout(check, 1e3)).observe(target, {
				childList: true,
				subtree: true
			});
			setTimeout(check, 3e3);
		}
		const wait = setInterval(() => {
			if (document.querySelector("[data-meeting-title]") || document.querySelector(".uGOf1d")) {
				clearInterval(wait);
				start();
			}
		}, 1500);
		setTimeout(() => clearInterval(wait), 3e4);
	})();

})()