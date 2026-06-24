(()=>{

	(() => {
		if (window.__x1GmailLoaded) return;
		window.__x1GmailLoaded = true;
		function send(action, data) {
			chrome.runtime.sendMessage({
				type: "PAGE_EXTRACT_RESULT",
				kind: "gmail",
				data: {
					action,
					...data,
					url: location.href,
					timestamp: (/* @__PURE__ */ new Date()).toISOString()
				}
			}).catch(() => {});
		}
		function extractEmail() {
			const subjectEl = document.querySelector("h2[data-thread-perm-id]") ?? document.querySelector(".hP");
			if (!subjectEl) return null;
			const subject = subjectEl.textContent?.trim() ?? "";
			const fromEl = document.querySelector(".gD[email]") ?? document.querySelector(".gD");
			const from = fromEl?.getAttribute("email") ?? fromEl?.textContent?.trim() ?? "";
			const fromName = fromEl?.textContent?.trim() ?? "";
			const recipients = document.querySelectorAll(".g2 .gD");
			const toList = [];
			recipients.forEach((el) => {
				const email = el.getAttribute("email");
				if (email) toList.push(email);
			});
			const date = document.querySelector(".g3")?.textContent?.trim() ?? "";
			const body = (document.querySelector(".a3s.aiL") ?? document.querySelector(".ii.gt div"))?.textContent?.trim().slice(0, 4e3) ?? "";
			const attachmentCount = document.querySelectorAll(".aQy .aV3").length;
			const labels = document.querySelectorAll(".av");
			const labelList = [];
			labels.forEach((el) => {
				const t = el.textContent?.trim();
				if (t) labelList.push(t);
			});
			return {
				subject,
				from,
				fromName,
				to: toList,
				date,
				body,
				attachmentCount,
				labels: labelList,
				snippet: body.slice(0, 200)
			};
		}
		function extractInboxStats() {
			return {
				unread_count: document.querySelectorAll(".zE").length,
				total_threads: document.querySelectorAll(".yO").length,
				spam_count: document.querySelectorAll(".Zt").length
			};
		}
		function extractSearchQuery() {
			return document.querySelector("input[aria-label*=\"buscar\" i], input[aria-label*=\"search\" i]")?.value?.trim() ?? "";
		}
		function extractComposeData() {
			return {
				composeSubject: document.querySelector("input[name=\"subjectbox\"]")?.value ?? "",
				composeBody: document.querySelector(".Am.Al.editable")?.textContent?.trim() ?? "",
				composeTo: document.querySelector("textarea[name=\"to\"]")?.value ?? ""
			};
		}
		let lastStateId = "";
		function check() {
			const email = extractEmail();
			if (email?.subject && email.from) {
				const id = `${email.subject}::${email.from}::${email.date}`;
				if (id !== lastStateId) {
					lastStateId = id;
					send("reading_email", { ...email });
				}
				return;
			}
			const compose = extractComposeData();
			if (compose.composeTo || compose.composeSubject) {
				const id = `compose::${compose.composeTo}`;
				if (id !== lastStateId) {
					lastStateId = id;
					send("composing", compose);
				}
				return;
			}
			const searchQ = extractSearchQuery();
			if (searchQ) {
				const id = `search::${searchQ}`;
				if (id !== lastStateId) {
					lastStateId = id;
					send("searching", { query: searchQ });
				}
				return;
			}
			if (lastStateId !== "__inbox__") {
				lastStateId = "__inbox__";
				send("inbox_view", extractInboxStats());
			}
		}
		function start() {
			const target = document.querySelector("[role=\"main\"]") ?? document.body;
			new MutationObserver(() => check()).observe(target, {
				childList: true,
				subtree: true,
				attributes: false,
				characterData: false
			});
			check();
		}
		const wait = setInterval(() => {
			if (document.querySelector("[role=\"main\"]") || document.querySelector(".AO")) {
				clearInterval(wait);
				start();
			}
		}, 1e3);
		setTimeout(() => clearInterval(wait), 3e4);
	})();

})()