import pathlib as p
import re as regex
from collections.abc import Callable
from functools import wraps
from types import UnionType
from typing import Any

import arguably
from tcrutils.console import c
from tcrutils.extract_error import extract_error, extract_traceback
from tcrutils.print import fmt_iterable
from tcrutils.types import QuotelessString

if True:  # const
	ROOT_DIR = p.Path(__file__).parent

	TEMPLATES_DIR = ROOT_DIR / "templates"
	DIST_DIR = ROOT_DIR / "dist"

if True:  # printing utils

	def aprint(
		__o: object,
		/,
		*,
		arrow_fn: Callable[[], str] = lambda: fmt_iterable(type, syntax_highlighting=1).replace("type", "-->"),
		**kwargs,
	) -> None:
		fmted = fmt_iterable(
			__o if not isinstance(__o, str) else QuotelessString(__o),
			syntax_highlighting=1,
			quoteless=True,
		)

		print(f"{arrow_fn()} {fmted}", **kwargs)

	def aerr(
		__o: object,
		/,
		*,
		arrow_fn: Callable[[], str] = lambda: fmt_iterable(False, syntax_highlighting=1).replace("False", " =>"),
		**kwargs,
	):
		return aprint(__o, arrow_fn=arrow_fn, **kwargs)


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
			r"{{(#*)(.*?)\1}}"
			f"{close}"
		)

	_REGEX_HTML = make_regex_for_parenthesis("<!--", "-->")
	_REGEX_CSTYLE = make_regex_for_parenthesis("/* ", " */")
	_REGEX_PY = make_regex_for_parenthesis("# ", "")

	REGEX_MAPPING = {
		"html": _REGEX_HTML,
		"js": _REGEX_CSTYLE,
		"css": _REGEX_CSTYLE,
		"py": _REGEX_PY,
	}

	class PlaceholderEvalError(Exception):
		def __init__(self, original_placeholder: str) -> None:
			super().__init__(f"Failed to evaluate placeholder: {original_placeholder!r} because of the following:")

	def eval_single_placeholder(placeholder: str) -> str:
		try:
			return str(eval(placeholder, locals=EXPOSED_LOCALS))
		except Exception as e:
			e2 = PlaceholderEvalError(placeholder)
			e2.add_note(extract_traceback(e))
			e2.add_note(extract_error(e))
			raise e2 from e

	def eval_placeholders_in_str(s: str, *, pat: regex.Pattern) -> str:
		return pat.sub(
			lambda m: eval_single_placeholder(m.group(2)),
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

	def include_path(path: p.Path) -> str:
		return eval_placeholders_in_str(
			path.read_text(encoding="utf-8"),
			pat=REGEX_MAPPING[path.suffix.removeprefix(".")],
		)

	def include(filename: str) -> str:
		return include_path(TEMPLATES_DIR / filename).strip()

	EXPOSED_LOCALS = {
		"include": include,
		"include_path": include_path,
		"rr": ReprRepr(),
	}


@arguably.command
def __root__() -> None:
	if not TEMPLATES_DIR.is_dir():
		raise RuntimeError("Why is '/templates' missing or not dir? huh?")
	DIST_DIR.mkdir(exist_ok=True)

	init_filename = "LeashedLibrus.user.js"

	init_file = TEMPLATES_DIR / init_filename

	if not init_file.is_file():
		raise RuntimeError(f"Why is {f'/{init_file.relative_to(ROOT_DIR)}'!r} missing or not file? huh?")

	(DIST_DIR / init_filename).write_text(include(init_filename))


if __name__ == "__main__":
	arguably.run()
	aprint("Done!")
