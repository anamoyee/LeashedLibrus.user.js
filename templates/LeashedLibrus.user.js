// ==UserScript==
// @name         LeashedLibrus
// @namespace    http://github.com/anamoyee
// @version      2025-06-25
// @description  Turns out librus is a subby bottom, try tugging on their leash and see what happens~
// @author       anamoyee
// @match        *://*.librus.pl/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @run-at       document-body
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

var IS_IFRAME = window.top !== window.self;
var HREF = document.location.href;
var REF = document.location.href.replace(/^https?:\/\//, "");

document.ll = {
	get: GM_getValue,
	set: GM_setValue,
};

//#region utils.js
/*{{! i = 10 }}*/
/*{{! getvars = lambda i=i: ', '.join(f'm{i}' for i in range(i)) }}*/
function log(/*{{ getvars() + ',' }}*/ { color = "#007fff", fn = console.log } = {}) {
	const arr = [
		/*{{ getvars() }}*/
	];
	const filtered = arr.filter((v) => v !== undefined);
	const msgs = filtered.length ? filtered : [undefined];

	const arrow = `%c${IS_IFRAME ? "(iframe) " : ""}==>%c`;
	const styles = [`color: ${color}; font-weight: bold;`, ""];

	fn(`${arrow}`, ...styles, ...msgs);
}

/**
 * Append a new \<style> element as last child of \<head>
 */
function apply_css(css) {
	const styleElement = document.createElement("style");

	styleElement.textContent = css;
	log("Applied style:", styleElement);

	document.head.appendChild(styleElement);
	document.addEventListener("DOMContentLoaded", () => {
		document.body.appendChild(styleElement); // also append to body, in case either gets removed (which happens)
	});
}

/**
 * Execute HTML Source and return it as a div containing it.
 *
 * @param {String} html_src
 * @returns {HTMLDivElement}
 */
function exec_html_into_div(html_src, { div = undefined, execute_scripts = true } = {}) {
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
}

/**
 * Unselect the text on the web page, if any
 */
function unselect_on_page() {
	if (window.getSelection) {
		const sel = window.getSelection();
		if (sel) sel.removeAllRanges();
	} else if (document.selection) {
		// IE fallback
		document.selection.empty();
	}
}

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
function add_to_top_bar(el, { append_instead = false } = {}) {
	let main_menu_list = document.querySelector("#main-menu .main-menu-list");

	if (!append_instead) {
		/* NOTE: the above condition is correct since the list is rendered right-to-left */
		main_menu_list.append(el);
	} else {
		main_menu_list.prepend(el);
	}
}
//#endregion

//#region settings.js
/**
 * Creates the settings node - caller should append it wherever.
 *
 * @returns {Element} Settings node element.
 */
function make_settings_icon_node() {
	return exec_html_into_div(`/*{{ include("components/settings_icon.html") }}*/`).firstElementChild;
}

function install_settings() {
	document.addEventListener("DOMContentLoaded", () => {
		if (document.querySelector("#ll_settings_root") === null) {
			let div = document.createElement("div");
			document.body.appendChild(div);
			exec_html_into_div(`/*{{ include("components/settings.html") }}*/`, { div: div });
		}
	});
}
//#endregion

//#region main.js
async function _start() {
	log(`Loading... (${document.querySelectorAll("*").length}, ${HREF})`);

	if (!IS_IFRAME) install_settings();

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
				/^portal\.librus\.pl\/rodzina\/synergia\/loguj$/,
				() => {
					apply_css(`/*{{ include('css/login_adblock.css') }}*/`);
					document.querySelector(".navbar_menu").appendChild(make_settings_icon_node());
				},
			],
			[
				/^synergia\.librus\.pl/,
				() => {
					apply_css(`/*{{ include('css/adblock.css') }}*/`);

					if (1) {
						apply_css(`/*{{ include('css/tweaks/terminarz/hide_weekend.css') }}*/`);
					}

					if (1) {
						apply_css(`/*{{ include('css/tweaks/plan_lekcji/hide_weekend.css') }}*/`);
					}

					document.addEventListener("DOMContentLoaded", () => {
						let settings_li = document.createElement("li");
						settings_li.appendChild(make_settings_icon_node());

						add_to_top_bar(settings_li, { append_instead: true });

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
		];

		for (const [pattern, callback] of href_lookup) {
			if ((pattern instanceof RegExp && pattern.test(REF)) || pattern === REF) {
				callback();
			}
		}
	}
}

// log(
// 	document.querySelectorAll(
// 	)
// );

_start();
//#endregion
