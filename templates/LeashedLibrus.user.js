// ==UserScript==
// @name         LeashedLibrus
// @namespace    http://github.com/anamoyee
// @version      /*{{ now.strftime("%Y-%m-%d_%H-%M") }}*/
// @description  Turns out librus is a subby bottom, try tugging on their leash and see what happens~
// @author       anamoyee
// @homepageURL  https://github.com/anamoyee/LeashedLibrus.user.js
// @source       https://github.com/anamoyee/LeashedLibrus.user.js
// @match        *://*.librus.pl/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @run-at       document-body
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

/*
/*{{ PREPROCESSING_NOTE }}*/
/**/

var IS_IFRAME = window.top !== window.self;
var HREF = document.location.href;
var REF = document.location.href.replace(/^https?:\/\//, "");
var PARAMS = Object.fromEntries(new URLSearchParams(window.location.search).entries());

/**
 * `1`-`7`; `1` = `Monday`
 */
var WEEKDAY = ((new Date().getDay() + 6) % 7) + 1;
document.body.setAttribute("ll-weekday", `${WEEKDAY}`);

document.ll = {
	get: GM_getValue,
	set: GM_setValue,
};

let u = {
	/*{{! i = 10 }}*/
	/*{{! getvars = lambda i=i: ', '.join(f'm{i}' for i in range(i)) }}*/
	/* well... this usage doesnt make sense now i realised, because you cant access the obj arg anyway but let's keep it for example purposes */
	log(/*{{ getvars() + ',' }}*/ { color = "#007fff", fn = console.log } = {}) {
		const arr = [
			/*{{ getvars() }}*/
		];
		const filtered = arr.filter((v) => v !== undefined);
		const msgs = filtered.length ? filtered : [undefined];

		const arrow = `%c${IS_IFRAME ? "(iframe) " : ""}==>%c`;
		const styles = [`color: ${color}; font-weight: bold;`, ""];

		fn(`${arrow}`, ...styles, ...msgs);
	},

	/**
	 * Append a new \<style> element as last child of \<head>
	 */
	apply_css(css) {
		const styleElement = document.createElement("style");

		styleElement.textContent = css;
		u.log("Applied style:", styleElement);

		document.head.appendChild(styleElement);
		document.addEventListener("DOMContentLoaded", () => {
			document.body.appendChild(styleElement); // also append to body, in case either gets removed (which happens)
		});
	},

	/**
	 * Execute HTML Source and return it as a div containing it.
	 *
	 * @param {String} html_src
	 * @returns {HTMLDivElement}
	 */
	exec_html_into_div(html_src, { div = undefined, execute_scripts = true } = {}) {
		if (div === undefined) {
			div = document.createElement("div");
		}
		div.innerHTML = html_src.trim();

		if (execute_scripts) {
			const scripts = div.querySelectorAll("script");

			for (const old of scripts) {
				const fresh = document.createElement("script");

				for (const attr of old.attributes) {
					fresh.setAttribute(attr.name, attr.value);
				}

				if (!old.src) {
					fresh.textContent = old.textContent;
				}

				old.replaceWith(fresh);
			}
		}

		return div;
	},

	/**
	 * Unselect the text on the web page, if any
	 */
	unselect_on_page() {
		if (window.getSelection) {
			const sel = window.getSelection();
			if (sel) sel.removeAllRanges();
		} else if (document.selection) {
			// IE fallback
			document.selection.empty();
		}
	},

	/**
	 * [Only available when logged in] prepend (unless specified to `append_instead`) a \<li> ... \</li>to the top bar (normally: `[Organizacja, Uczeń, Ankiety, ...]`)
	 *
	 * The following structure can be adopted to create simple button:
	 * ```html
	 * <li>
	 * 	<a href="javascript: 'whatever or add event listener'">Always visible button</a>
	 * </li>
	 * ```
	 *
	 * The following structure can be adopted to create a submenu:
	 * ```html
	 * <li>
	 * 	<a href="javascript: 'whatever or add event listener'">Always visible button</a>
	 * 	<ul>
	 * 		<li><a href="javascript: action1();">Item 1</a></li>
	 * 		<li><a href="javascript: action2();">Item 2</a></li>
	 * 		<li><a href="javascript: action3();">Item 3</a></li>
	 * 	</ul>
	 * </li>
	 * ```
	 *
	 * @param {boolean} [append_instead=false]
	 * @param {HTMLLIElement} el
	 */
	add_to_top_bar(el, { append_instead = false, missing_ok = false } = {}) {
		let main_menu_list = document.querySelector("#main-menu .main-menu-list");

		if (main_menu_list === null && missing_ok) {
			return;
		}

		if (!append_instead) {
			/* NOTE: the above condition is correct since the list is rendered right-to-left */
			main_menu_list.append(el);
		} else {
			main_menu_list.prepend(el);
		}
	},

	/**
	 * Return a shortened version for a nazwa lekcji (Pages: Terminarz, Oceny, etc.)
	 * Useful for layouts made for low width devices.
	 * Example: 'aplikacje serwerowe' => 'AplSer'
	 * @param {String} s Regular nazwa lekcji
	 * @returns {String}
	 */
	shorten_nazwa_lekcji(s) {
		if (typeof s !== "string") {
			log(`Invalid type passed to shorten_nazwa_lekcji(), ${typeof s}, ${s}`);
			return "[TypeError]";
		}

		s = s.trim().toLowerCase();

		const overrides = {
			"wychowanie fizyczne": "WF",
			"zajęcia z wychowawcą": "ZajZWych",
			"język niemiecki": "Niem",
			"angielski zawodowy": "AZawo",
			"aplikacje klienckie": "AppKli",
			"aplikacje serwerowe": "AppSrv",
			"projektowanie stron internetowych": "PSI <small style='opacity: 0.5'>Patrol</small>", // hehe~
		};

		if (overrides[s]) return overrides[s];

		const prefix = "język ";
		if (s.startsWith(prefix)) {
			const rest = s.slice(prefix.length);
			return u.shorten_nazwa_lekcji(rest);
		}

		return s
			.split(" ")
			.map((w) => `${w[0].toUpperCase()}${w.slice(1, 3).toLowerCase()}`)
			.join("");
	},
};

let s = {
	/**
	 * Creates the settings node - caller should append it wherever.
	 *
	 * @returns {Element} Settings node element.
	 */
	make_icon_node() {
		return u.exec_html_into_div(/*{{ js_include("components/settings_icon.html") }}*/ +"").firstElementChild;
	},
	/**
	 * Install the settings element into `document.body`
	 */
	install() {
		document.addEventListener("DOMContentLoaded", () => {
			if (document.querySelector("#ll_settings_root") === null) {
				let div = document.createElement("div");
				document.body.appendChild(div);
				u.exec_html_into_div(/*{{ js_include("components/settings.html") }}*/ +"", { div: div });
			}
		});
	},

	SETTINGS_DEFAULTS: (() => {
		/* Default values for settings */

		let SETTINGS_DEFAULTS = {
			settings_css_adblock: true,
			settings_css_hide_weekends: true,
			settings_customcss: "",
			tooltip_fixed_pos: false,
		};

		for (const key in SETTINGS_DEFAULTS) {
			const current = document.ll.get(key);
			if (PARAMS.hasOwnProperty("reset") || current === undefined) {
				document.ll.set(key, SETTINGS_DEFAULTS[key]);
			}
		}

		if (PARAMS.hasOwnProperty("reset")) {
			const url = new URL(window.location);
			url.searchParams.delete("reset");
			window.history.replaceState({}, "", url);
		}

		return SETTINGS_DEFAULTS;
	})(),
};

async function _start() {
	u.log(`Loading... (${document.querySelectorAll("*").length}, ${HREF})`);

	if (!IS_IFRAME) {
		u.apply_css(document.ll.get("settings_customcss"));
		s.install();
	}

	await main();
}

async function main() {
	{
		/* per-href */

		const href_lookup = [
			[
				"portal.librus.pl/rodzina",
				() => {
					window.location.href = "https://portal.librus.pl/rodzina/synergia/loguj";
				},
			],
			[
				/^portal\.librus\.pl\/rodzina\/synergia\/loguj/,
				() => {
					if (document.ll.get("settings_css_adblock")) {
						u.apply_css(/*{{ js_include('css/login_adblock.css') }}*/ +"");
					}
					document.querySelector(".navbar_menu").appendChild(s.make_icon_node());
				},
			],
			[
				/^synergia\.librus\.pl/,
				() => {
					if (document.ll.get("tooltip_fixed_pos")) {
						u.apply_css(/*{{ js_include('css/tweaks/tooltip_bottom_left.css') }}*/);
					}

					if (document.ll.get("settings_css_adblock")) {
						u.apply_css(/*{{ js_include('css/adblock.css') }}*/ +"");
					}

					if (document.ll.get("settings_css_hide_weekends")) {
						u.apply_css(/*{{ js_include('css/tweaks/terminarz/hide_weekend.css') }}*/ +"");
						u.apply_css(/*{{ js_include('css/tweaks/plan_lekcji/hide_weekend.css') }}*/ +"");
					}

					document.addEventListener("DOMContentLoaded", () => {
						let settings_li = document.createElement("li");
						settings_li.appendChild(s.make_icon_node());

						u.add_to_top_bar(settings_li, { append_instead: true, missing_ok: true });

						{
							/* Don't open plan lekcji in a whole new window */
							let plan_lekcji_el = document.querySelector(
								`li > a[href="javascript:otworz_w_nowym_oknie('/przegladaj_plan_lekcji','plan_u',0,0)"]`,
							);
							if (plan_lekcji_el) plan_lekcji_el.href = "/przegladaj_plan_lekcji";
						}
					});
				},
			],
			[
				/^synergia\.librus\.pl\/terminarz/,
				() => {
					u.apply_css(/*{{ js_include("css/tweaks/terminarz/mobile.css") }}*/ +"");
				},
			],
			[
				/^synergia\.librus\.pl\/przegladaj_plan_lekcji/,
				() => {
					u.apply_css(/*{{ js_include("css/tweaks/plan_lekcji/mobile.css") }}*/ +"");
					document.addEventListener("DOMContentLoaded", (e) => {
						document.querySelectorAll(".plan-lekcji tbody tr.line1 td.line1").forEach((td) => {
							if (!td.querySelector("div")) return;

							if (td.querySelector("div.plan-lekcji-info")) {
								let info_text = td.querySelector("div.plan-lekcji-info").innerText.trim();
								let tooltip = `${info_text}`;

								let td_a = td.querySelector("a");
								if (td_a) {
									let td_a_title = td_a.getAttribute("title");
									if (td_a_title) {
										tooltip = `${td_a_title}`;
									}
									td_a.remove();
								}
								if (td.querySelector("s > s")) {
									let td_s_s_title = td.querySelector("div.plan-lekcji-info").getAttribute("title");

									if (td_s_s_title) {
										tooltip = `${td_s_s_title}`;
									}
								}

								if (td.querySelector("div.plan-lekcji-info")) td.querySelector("div.plan-lekcji-info").remove();

								if (info_text === "zastępstwo") {
									td.style.backgroundColor = "rgb(164, 200, 1)";
									td.style.color = "white";
									td.style.textShadow = "1px 1px 0px black";
								}

								if (info_text === "odwołane") {
									td.style.backgroundColor = "rgb(200, 57, 1)";
									td.style.color = "white";
									td.style.textShadow = "1px 1px 0px black";
								}

								if (tooltip) {
									td.classList.add("tooltip");
									td.setAttribute("title", `<code>${info_text}</code>:<br>${tooltip}`);
								}
							}

							let div = td.querySelector("div.text");

							let div_b = div.querySelector("b");
							div_b.style.fontFamily = "monospace";

							div_b.innerHTML = u.shorten_nazwa_lekcji(div_b.innerText);

							let div_freestanding_text = "";

							div.childNodes.forEach((node) => {
								if (node.nodeType === Node.TEXT_NODE) {
									div_freestanding_text += node.textContent;
									node.remove();
								}
							});

							div_freestanding_text = div_freestanding_text.trim().replace(/^- */, "");

							let RE = /^(?<teacher>[\p{L}\-]+\s\p{L}+)(?:\s*(?:\([\w_\.]+\))?\s*)?(?:s.\s(?<s>\d+))?$/v;

							let m = div_freestanding_text.match(RE);
							if (m) {
								let teacher_initials = m.groups.teacher
									.split(/\s+/)
									.map((s) => s[0].toUpperCase())
									.reverse()
									.join("");

								let s = m.groups.s;

								let out_str;

								if (s) {
									out_str = `${teacher_initials} [${s}]`;
								} else {
									out_str = `${teacher_initials}`;
								}

								div.append(out_str);
							} else {
								u.log(div_freestanding_text);
								div.append(div_freestanding_text);
							}
						});
					});
				},
			],
		];

		for (const [pattern, callback] of href_lookup) {
			if ((pattern instanceof RegExp && pattern.test(REF)) || pattern === REF) {
				callback();
			}
		}
	}
}

_start();
