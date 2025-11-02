// ==UserScript==
// @name         Librus Unshittify
// @namespace    http://tampermonkey.net/
// @version      2025-06-25
// @description  try to take over the world!
// @author       You
// @match        *://synergia.librus.pl/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

function applyStyling(styling) {
  const styleElement = document.createElement("style");

  styleElement.textContent = styling;
  console.log("applied style", styleElement);

  document.head.appendChild(styleElement);
}

function applyLibrusUnshittifyStyling() {
  const css = `
  * {
	font-family: 'Verdana', sans-serif;
  }



  li:has(#icon-wcag) {
	 display: none;
  }

  li:has(#icon-bezpiecznyuczen) {
	 display: none;
  }

  li:has(#icon-aplikacjamobilna) {
	 display: none;
  }




  select#language{
	 display: none;
  }



  ul.main-menu-list > li:has(a[href="/help/D251"]){
	display: none;
  }

  #absenceGraph{
	display: none;
  }

  .plan-lekcji tr.line1 td, .plan-lekcji tr.line1 th {
	height: 30px !important;
  }

  table.plan-lekcji tr > :nth-child(8),
  table.plan-lekcji tr > :nth-child(9),
  table.plan-lekcji tr > :nth-child(10) {
	  display: none;
  }

  table.plan-lekcji tr > :nth-child(1) {
	  padding: 0;
	  margin: 0;
	  max-width: 30px;
  }

  /* Only the first cell in the first column of thead */
  table.plan-lekcji thead tr:first-child > :nth-child(1) {
	  text-align: center;
	  vertical-align: middle;
	  color: transparent;
	  position: relative;
  }

  /* Visually replace text with "#" */
  table.plan-lekcji thead tr:first-child > :nth-child(1)::before {
	  content: "#";
	  color: black;
	  position: absolute;
	  top: 50%;
	  left: 50%;
	  transform: translate(-50%, -50%);
  }


  form[action='/przegladaj_plan_lekcji'] table.filters thead,
  form[action='/przegladaj_plan_lekcji'] table.filters tbody tr:nth-child(2),
  form[action='/przegladaj_plan_lekcji'] table.filters tbody tr:nth-child(3),
  form[action='/przegladaj_plan_lekcji'] table.filters tbody tr:nth-child(4) {
	  display: none;
  }

  form[action='/przegladaj_plan_lekcji'] table.filters tbody th {
	  border: 0;
	  scale: 2;
  }

  form[action='/przegladaj_plan_lekcji'] table.filters {
	  margin: 20px;
  }

  .warning-box:has(a[href="/wiadomosci_archiwum"]) { /* Informacja o tym że po nowym roku wiadomosci przenoszone są do archiwum */
	  display: none;
  }
  `;

  applyStyling(css);
}

function usunNiepotrzebneWierszeZPrzegladuOcen() {
  const niepotrzebne = ["język francuski", "zajęcia z wychowawcą", "religia"];

  const rows = document.querySelectorAll("table.decorated tbody tr");

  let usuniete = 0;

  rows.forEach((row) => {
    const subjectCell = row.querySelector("td:nth-child(2)");

    if (subjectCell) {
      const subjectText = subjectCell.textContent.toLowerCase().trim();

      if (niepotrzebne.includes(subjectText)) {
        row.remove();
        usuniete++;

        const nextRow = row.nextElementSibling;
        if (
          nextRow &&
          nextRow.getAttribute("name") === row.getAttribute("name")
        ) {
          nextRow.remove();
        }
      }
    }
  });

  console.log(
    `Librus Unshittify: usunieto ${usuniete} przedmiotow z tabeli ocen`
  );
}

function getSzczesliwyNumerek() {
  let el = document.querySelector(".luckyNumber b");
  if (!el) return 0;

  return parseInt(el.innerText);
}

function addBottomNav() {
  if (document.getElementById("stickyBottomNav")) return;

  const banner = document.querySelector("#top-banner-container");
  if (banner) banner.remove();

  // Example callback function
  function calculate(btn) {
    alert("Calculate function executed!");
  }

  function labl_make_square(btn) {
    btn.style.minWidth = "6vh";
    btn.style.width = "6vh";
    btn.style.maxWidth = "6vh";
    btn.style.paddingLeft = "0";
    btn.style.paddingRight = "0";
  }

  function labl_random_number(btn) {
    var value = getSzczesliwyNumerek();

    btn.disabled = true;

    labl_make_square(btn);

    if (value === 4) btn.style.backgroundColor = "yellow";

    console.log(btn);

    return value.toString();
  }

  // Buttons array: [label (string or function), action (string or function)]
  const buttons = [
    [labl_random_number, undefined],
    ["<b>PLAN</b>", "/przegladaj_plan_lekcji"],
    ["Terminarz", "/terminarz"],
    ["Oceny", "/przegladaj_oceny/uczen"],
    ["Freq", "/przegladaj_nb/uczen"],
    ["Wiadomości", "/wiadomosci"],
    ["Ogłoszenia", "/ogloszenia"],
    // Example dynamic label and dynamic action:
    // [btn => "<b>DYNAMIC</b>", btn => { alert("Clicked " + btn.innerHTML); }],
    // [btn => { btn.innerHTML = "<i>Custom</i>"; }, btn => { alert("Clicked " + btn.innerHTML); }]
  ];

  const navCSS = `
	  .tm-sticky-nav {
		  position: fixed;
		  bottom: 0;
		  left: 0;
		  width: 100%;
		  display: flex;
		  flex-wrap: wrap;
		  justify-content: flex-start;
		  align-content: flex-start;
		  padding: 0.5rem;
		  background: #f0f0f0;
		  box-shadow: 0 -0.2rem 0.5rem rgba(0,0,0,0.2);
		  z-index: 9999;
		  box-sizing: border-box;
		  max-height: 50vh;
		  overflow-y: auto;
	  }
  
	  .tm-sticky-nav button {
		  flex: 1 1 auto;
		  height: 6vh;
		  margin: 0;
		  padding: 2vh 2vw;
		  font-size: 1.5rem;
		  cursor: pointer;
		  box-sizing: border-box;
		  display: flex;
		  align-items: center;
		  justify-content: center;
	  }
  
	  .tm-sticky-nav button:disabled {
		  color: #000; /* keep font black */
		  background-color: #dcdcdc; /* lighter gray background */
		  border: 1px solid #999; /* or match your normal button border */
	  }
	  `;

  applyStyling(navCSS);

  const nav = document.createElement("nav");
  nav.id = "stickyBottomNav";
  nav.className = "tm-sticky-nav";

  // Create buttons from array
  buttons.forEach(([label, action]) => {
    const btn = document.createElement("button");

    // Set the label
    if (typeof label === "string") {
      btn.innerHTML = label;
    } else if (typeof label === "function") {
      const result = label(btn);
      if (typeof result === "string") {
        btn.innerHTML = result; // framework sets innerHTML if returned
      }
      // if undefined, assume callback handled innerHTML
    }

    // Set the action
    if (typeof action === "string") {
      btn.addEventListener("click", () => {
        window.location.href = action;
      });
    } else if (typeof action === "function") {
      btn.addEventListener("click", () => action(btn));
    }

    nav.appendChild(btn);
  });

  document.body.appendChild(nav);

  // Adjust body padding to match nav height
  const adjustPadding = () => {
    document.body.style.paddingBottom = nav.offsetHeight + "px";
  };

  adjustPadding();
  window.addEventListener("resize", adjustPadding);
}

function RUN_AS_CONDITIONAL_HOOKS(hooks) {
  const path = window.location.pathname.replace(/^\/+/, ""); // remove leading slash(es)

  for (const [predicate, callback] of hooks) {
    let shouldRun = false;

    if (predicate instanceof RegExp) {
      shouldRun = predicate.test(path);
    } else if (typeof predicate === "boolean") {
      shouldRun = predicate;
    } else if (typeof predicate === "function") {
      shouldRun = !!predicate();
    }

    if (shouldRun) {
      callback();
    }
  }
}

(function () {
  "use strict";

  addBottomNav();
  applyLibrusUnshittifyStyling();

  if (window.location.pathname === "/przegladaj_oceny/uczen") {
    usunNiepotrzebneWierszeZPrzegladuOcen();
    // Todo: Enable back the średnia ocen sheit
  }
})();

(function () {
  // regex string replacement - generated by chatgpt
  "use strict";

  return;

  // === CONFIGURE YOUR REPLACEMENTS HERE ===
  const replacements = [
    // { from: /projektowanie stron internetowych/gi, to: "Psi Patrol" },
    // { from: /geografia/gi, to: "Gejografia"},
    // { from: /nauczyciel/i, to: "Nauczycwel" },
    // Add more here
    // { from: /example/gi, to: "replacement" },
  ];

  const processedAttr = "data-librus-replaced";

  // === TEXT NODE WALKER ===
  function walkAndReplace(node) {
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (n) => {
          // Only allow visible text, ignore scripts/styles/inputs
          const parent = n.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (
            parent.closest(
              'script, style, textarea, input, [contenteditable="true"]'
            )
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.hasAttribute(processedAttr)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      },
      false
    );

    let currentNode;
    while ((currentNode = walker.nextNode())) {
      let text = currentNode.nodeValue;
      let replaced = false;

      for (const { from, to } of replacements) {
        if (from.test(text)) {
          text = text.replace(from, to);
          replaced = true;
        }
      }

      if (replaced) {
        currentNode.nodeValue = text;
        currentNode.parentElement.setAttribute(processedAttr, "true");
      }
    }
  }

  // === INITIAL RUN ===
  walkAndReplace(document.body);

  // === OBSERVER FOR DYNAMIC CONTENT ===
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          walkAndReplace(node);
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
