// ==UserScript==
// @name         LeashedLibrus
// @namespace    http://github.com/anamoyee
// @version      2025-06-25
// @description  Turns out librus is a subby bottom, try tugging on their leash and see what happens~
// @author       anamoyee
// @match        *://*.librus.pl/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==

var IS_IFRAME = window.top !== window.self;
var HREF = document.location.href;
var REF = document.location.href.replace(/^https?:\/\//, "");

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
}

/**
 * Creates a DOM element with attributes and children.
 *
 * @param {string} tag
 *   The tag name of the element to create (e.g. "div", "button").
 *
 * @param {Object<string, any>} [props]
 *   Attributes or event handlers to set on the element.
 *   Event handlers must start with "on", e.g. { onclick: () => {} }.
 *
 * @param {...(Node|string)} children
 *   Child nodes to append. Non-Node values are converted to text nodes.
 *
 * @returns {Element}
 *   The newly created DOM element.
 */
function h(tag, props = {}, ...children) {
	const el = document.createElement(tag);
	for (const [k, v] of Object.entries(props)) {
		if (k.startsWith("on") && typeof v === "function") {
			el.addEventListener(k.slice(2).toLowerCase(), v);
		} else {
			el.setAttribute(k, v);
		}
	}
	for (const c of children) {
		el.append(c instanceof Node ? c : document.createTextNode(String(c)));
	}
	return el;
}

/**
 *
 * @param {String} html_src
 * @returns {HTMLDivElement}
 */
function exec_html_into_div(html_src) {
	var div = document.createElement("div");
	div.innerHTML = html_src.trim();

	// Change this to div.childNodes to support multiple top-level nodes.
	return div;
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
	if (document.querySelector("#ll_settings_root") === null) {
		document.body.appendChild(exec_html_into_div(`/*{{ include("components/settings.html") }}*/`));
	}
}
//#endregion

//#region main.js
function _start() {
	log(`Loading... (${document.querySelectorAll("*").length}, ${HREF})`);

	if (!IS_IFRAME) install_settings();

	main();
}

function main() {
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
				/portal\.librus\.pl\/rodzina\/synergia\/loguj/,
				() => {
					apply_css(` /*{{ include('css/login_adblock.css') }}*/ `);
					document.querySelector(".navbar_menu").appendChild(make_settings_icon_node());
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
