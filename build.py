import time
from datetime import datetime

t0 = time.perf_counter()
import pathlib as p
import re as regex
import select
import sys
import traceback
from collections.abc import Callable
from typing import Any

import arguably
from tcrutils.console import c
from tcrutils.print import fmt_iterable
from tcrutils.types import QuotelessString
from tcrutils.void import void

if True:  # const
	USE_COLOR = sys.stdout.isatty()

	ROOT_DIR = p.Path(__file__).parent

	TEMPLATES_DIR = ROOT_DIR / "templates"
	DIST_DIR = ROOT_DIR / "dist"

if True:  # utils

	def aprint(
		__o: object,
		/,
		*,
		arrow_fn: Callable[[], str] = lambda: fmt_iterable(type, syntax_highlighting=USE_COLOR).replace("type", "-->"),
		**kwargs,
	) -> None:
		fmted = fmt_iterable(
			__o if not isinstance(__o, str) else QuotelessString(__o),
			syntax_highlighting=USE_COLOR,
			quoteless=True,
		)

		print(f"{arrow_fn()} {fmted}", **kwargs)

	def aerr(
		__o: object,
		/,
		*,
		arrow_fn: Callable[[], str] = lambda: fmt_iterable(False, syntax_highlighting=USE_COLOR).replace("False", " =>"),
		**kwargs,
	):
		return aprint(__o, arrow_fn=arrow_fn, **kwargs)

	def as_block_text(s, /, line_length: int = 70) -> str:
		"""Split text on whitespace and reassemble it into lines no longer than the given line length."""
		words = s.replace("\n", " ").split()
		result_lines = []
		current_line = ""

		for word in words:
			if not current_line:
				current_line = word
			else:
				if len(current_line) + 1 + len(word) <= line_length:
					current_line += " " + word
				else:
					result_lines.append(current_line)
					current_line = word

		if current_line:
			result_lines.append(current_line)

		return "\n".join(result_lines)


if True:  # Evaluation Machinery

	def make_regex_for_parenthesis(open: str = "", close: str = "") -> regex.Pattern:
		"""Make a regex.Pattern for an expr placeholder for jinja-like in-file replacement."""

		def prepare(s: str) -> str:
			r"""Normalize leading & trailing spaces, replace any with a `\s*`."""
			startswith_space = s.startswith(" ")
			endswith_space = s.endswith(" ")

			s = s.strip()
			s = regex.escape(s)

			if startswith_space:
				s = rf"\s*{s}"
			if endswith_space:
				s = rf"{s}\s*"

			return s

		open = prepare(open)
		close = prepare(close)

		return regex.compile(
			f"{open}"
			r"{{(?P<bang>!?)(#*)(?P<content>.*?)\2}}"
			f"{close}",
			flags=regex.DOTALL,  # dot matches multiline exprs/execs
		)

	REGEX_MAPPING = {
		"html": (_REGEX_EVAL_HTML := make_regex_for_parenthesis("<!--", "-->")),
		"svg": _REGEX_EVAL_HTML,
		"js": (_REGEX_EVAL_CSTYLE := make_regex_for_parenthesis("/* ", " */")),
		"css": _REGEX_EVAL_CSTYLE,
		"py": make_regex_for_parenthesis("# ", ""),
		None: _REGEX_EVAL_CSTYLE,
	}

	class PlaceholderEvalError(Exception):
		def __init__(self, original_placeholder: str) -> None:
			super().__init__(f"[LOOK ABOVE TO SEE THE ROOT CAUSE] Failed to evaluate placeholder: {original_placeholder!r}")

	def eval_single_placeholder(content: str, bang: str) -> str:
		try:
			if bang:  # exec
				EXPOSED_LOCALS["_"] = ""

				exec(content.lstrip(" "), locals=EXPOSED_LOCALS)

				return str(EXPOSED_LOCALS.get("_"))
			else:
				return str(eval(content, locals=EXPOSED_LOCALS))
		except Exception as e:
			raise PlaceholderEvalError(content) from e

	def eval_placeholders_in_str(s: str, *, pat: regex.Pattern) -> str:
		return pat.sub(
			lambda m: eval_single_placeholder(**m.groupdict()),
			s,
		)


if True:  # Preprocessor functionality

	class ReprRepr:
		def __call__(self, __o: Any, /) -> str:
			return repr(repr(__o))

		def __or__(self, other: Any) -> str:
			return self(other)

		def __lshift__(self, other: Any) -> str:
			return self(other)

		def __repr__(self) -> str:
			return "https://i.kym-cdn.com/entries/icons/original/000/023/397/C-658VsXoAo3ovC.jpg"

	def _include(path: p.Path) -> str:
		return eval_placeholders_in_str(
			path.read_text(encoding="utf-8"),
			pat=REGEX_MAPPING.get(path.suffix.removeprefix("."), REGEX_MAPPING[None]),
		)

	def include(filename: str) -> str:
		"""During pre-processing read the file of the given strpath (anchored at `/templates` dir). Return the contents of the file at said path as str."""
		return _include(TEMPLATES_DIR / filename).strip()

	def js_include(filename: str) -> str:
		"""During pre-processing read the file of the given strpath (anchored at `/templates` dir). Apply further processing to escape any characters in the file and return a string containing a valid JS expression that evaluates to the string containing the contents of the requested file."""
		return f"""
(() => {{ /* Dynamically inserted JS string from {filename.replace("*/", "_/")!r} */
	let ____backtick = "`"; let ____dollarenter = "${{";
	return String.raw`{include(filename).replace("${", "${____dollarenter}").replace("`", "${____backtick}")}`
}})()
"""[1:-1]

	EXPOSED_LOCALS = {
		"include": include,
		"include_path": _include,
		"include_style": lambda s: f"<style>{include(s)}</style>",
		"rr": ReprRepr(),
		"void": void,
		"now": datetime.now().astimezone(),
		"PREPROCESSING_NOTE": (
			f"! IMPORTANT NOTE IF YOU ARE EXAMINING THE CODE:\n\n{
				as_block_text(
					'''
The contents of this source code file were altered using a pre-processor.
The code WILL look unreadable. See the source code, contribute, or compile it yourself via github.
'''.strip(),
					line_length=70,
				)
			}"
			* 1  # repeat the body of the announcement this many times
		).strip(),
	}


@arguably.command
def __root__() -> None:
	if not TEMPLATES_DIR.is_dir():
		raise RuntimeError("Why is '/templates' missing or not dir? huh?")
	DIST_DIR.mkdir(exist_ok=True)

	init_filename = "LeashedLibrus.user.js"

	init_file = TEMPLATES_DIR / init_filename

	if (
		select.select(  # check if any shit is present in sys.stdin
			[
				sys.stdin,
			],
			[],
			[],
			0.0,
		)[0]
	) and (STDIN_TEXT := sys.stdin.read()):  # zed editor formatter hook fix
		orig_sys_stdout = sys.stdout
		sys.stdout = sys.stderr
		orig_sys_stdout.write(STDIN_TEXT)
		orig_sys_stdout.flush()
		init_file.write_text(STDIN_TEXT)

	if not init_file.is_file():
		raise RuntimeError(f"Why is {f'/{init_file.relative_to(ROOT_DIR)}'!r} missing or not file? huh?")

	out_file = DIST_DIR / init_filename

	try:
		text_content = include(init_filename)
		text_content = "\n".join(line for line in text_content.split("\n") if (not line or line.strip() != ""))
		while "\n\n\n" in text_content:
			text_content = text_content.replace("\n\n\n", "\n\n")

	except Exception:

		def __fmt(line: str) -> str:
			if "Traceback" in line:
				return f"! {line}"

			return line

		out_file.write_text(
			f"""
/**
 * * A python exception was left unhandled during build:
 *
{"\n".join(f" * {__fmt(line)}".rstrip(" ") for line in traceback.format_exc().rstrip("\n").split("\n"))} */
"""[1:]
		)
		raise
	else:
		out_file.write_text(text_content)


if __name__ == "__main__":
	arguably.run()
	aprint(f"Done! (took {(time.perf_counter() - t0) * 1000:.1f}ms)")
