(()=>{

	(() => {
		if (window.__x1CalLoaded) return;
		window.__x1CalLoaded = true;
		function send(action, data) {
			chrome.runtime.sendMessage({
				type: "PAGE_EXTRACT_RESULT",
				kind: "calendar",
				data: {
					action,
					...data,
					url: location.href,
					timestamp: (/* @__PURE__ */ new Date()).toISOString()
				}
			}).catch(() => {});
		}
		function extractVisibleEvents() {
			const events = [];
			document.querySelectorAll("[data-eventid]").forEach((el) => {
				const eventId = el.getAttribute("data-eventid") || "";
				const title = el.getAttribute("aria-label") || el.textContent?.trim() || "";
				const time = el.querySelector(".Ml")?.textContent?.trim() ?? "";
				const allDay = el.classList.contains("g");
				events.push({
					eventId,
					title,
					time,
					allDay
				});
			});
			return events;
		}
		function extractDateRange() {
			const headerText = document.querySelector("[role=\"heading\"]")?.textContent?.trim() ?? "";
			const viewBtns = document.querySelectorAll("[role=\"tab\"]");
			let view = "month";
			viewBtns.forEach((el) => {
				if (el.getAttribute("aria-selected") === "true") {
					const label = el.getAttribute("aria-label")?.toLowerCase() || "";
					if (label.includes("week")) view = "week";
					else if (label.includes("day")) view = "day";
					else if (label.includes("schedule")) view = "schedule";
					else if (label.includes("year")) view = "year";
				}
			});
			return {
				headerText,
				view
			};
		}
		function extractMiniCalendar() {
			const dates = [];
			document.querySelectorAll(".tg-t a").forEach((el) => {
				const dateNum = el.textContent?.trim();
				if (dateNum) dates.push(dateNum);
			});
			return dates;
		}
		let lastStateId = "";
		function check() {
			const events = extractVisibleEvents();
			const dateRange = extractDateRange();
			const miniCal = extractMiniCalendar();
			const data = {
				events,
				dateRange,
				sidebarOpen: document.querySelector("[role=\"application\"]")?.querySelector(".QG") !== null,
				eventCount: events.length,
				miniCalendar: miniCal
			};
			const id = `${dateRange.headerText}::${dateRange.view}::${events.length}`;
			if (id !== lastStateId) {
				lastStateId = id;
				if (events.length > 0) send("viewing_events", data);
				else send("browsing", data);
			}
		}
		function start() {
			const target = document.querySelector("[role=\"application\"]") ?? document.body;
			new MutationObserver(() => setTimeout(check, 500)).observe(target, {
				childList: true,
				subtree: true
			});
			setTimeout(check, 1e3);
		}
		const wait = setInterval(() => {
			if (document.querySelector("[role=\"application\"]")) {
				clearInterval(wait);
				start();
			}
		}, 1e3);
		setTimeout(() => clearInterval(wait), 3e4);
	})();

})()