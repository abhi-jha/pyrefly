[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# Pyrefly: A fast type checker and IDE for Python

NOT INTENDED FOR EXTERNAL USE YET. INCOMPLETE AND IN DEVELOPMENT.

We are building a new version of Pyre (Meta's Python type checker), named
Pyrefly, to increase our internal velocity and enable new features such as
producing typed ASTs. We aim to fully replace the existing Pyre by the end
of 2025.

## Developer cheat sheet

### GitHub developers

`cd pyrefly` then use the normal `cargo` commands (e.g. `cargo build`,
`cargo test`).

### Meta internal developers

From this directory, you can run:

- Check things are plausible: `./test.py` (runs the basic tests and linter)
- Run a command: `buck2 run pyrefly -- COMMAND_LINE_ARGUMENTS`
  - For example, run on a single file: `buck2 run pyrefly -- check test.py`
- Run a single test: `buck2 test pyrefly -- NAME_OF_THE_TEST`
- Run the end-to-end tests: `buck2 test test:`
- Run `arc pyre` (a.k.a. per-target type checking) with Pyrefly:
  `arc pyre check <targets_to_check> -c python.type_checker=fbcode//pyrefly:pyrefly_for_buck`
- Debug a file: `buck2 run pyrefly -- check <filename> --debug-info=debug.js`,
  then open `debug.html` in your browser
- Fetch Typeshed from upstream
  `HTTPS_PROXY=https://fwdproxy:8080 fbpython scripts/fetch_typeshed.py -o pyrefly/third_party`

## Packaging

We use [maturin](https://github.com/PyO3/maturin) to build wheels and source
distributions. This also means that you can pip install `maturin` and use
`maturin build` and `maturin develop` for local development. `pip install .` in
the `pyrefly/pyrefly` directory works as well.

### Deploying to PyPI

Once a week, a
[CodemodService job](https://www.internalfb.com/code/fbsource/xplat/scripts/codemod_service/configs/fbcode_pyrefly_version_upgrade.toml)
generates a diff to update the version number. Accept this diff to upload a new
version to PyPI.

If you'd like to do a manual release between the weekly automated releases,
follow the instructions in
[version.bzl](https://www.internalfb.com/code/fbsource/fbcode/pyrefly/version.bzl)
to update the version number.

Behind the scenes, what's happening is:

- The
  [publish_to_pypi workflow](https://github.com/facebook/pyrefly/blob/main/.github/workflows/publish_to_pypi.yml)
  triggers on any change to version.bzl.
- This workflow calls the
  [build_binaries workflow](https://github.com/facebook/pyrefly/blob/main/.github/workflows/build_binaries.yml)
  to build release artifacts, uploads them, and tags the corresponding commit
  with the version number.

## Coding conventions

We follow the
[Buck2 coding conventions](https://github.com/facebook/buck2/blob/main/HACKING.md#coding-conventions),
with the caveat that we use our internal error framework for errors reported by
the type checker.

## Choices

There are a number of choices when writing a Python type checker. We are take
inspiration from [Pyre1](https://pyre-check.org/),
[Pyright](https://github.com/microsoft/pyright) and
[MyPy](https://mypy.readthedocs.io/en/stable/). Some notable choices:

- We infer types in most locations, apart from parameters to functions. We do
  infer types of variables and return types. As an example,
  `def foo(x): return True` would result in something equivalent to had you
  written `def foo(x: Any) -> bool: ...`.
- We attempt to infer the type of `[]` to however it is used first, then fix it
  after. For example `xs = []; xs.append(1); xs.append("")` will infer that
  `xs: List[int]` and then error on the final statement.
- We use flow types which refine static types, e.g. `x: int = 4` will both know
  that `x` has type `int`, but also that the immediately next usage of `x` will
  be aware the type is `Literal[4]`.
- We aim for large-scale incrementality (at the module level) and optimised
  checking with parallelism, aiming to use the advantages of Rust to keep the
  code a bit simpler.
- We expect large strongly connected components of modules, and do not attempt
  to take advantage of a DAG-shape in the source code.

## Design

There are many nuances of design that change on a regular basis. But the basic
substrate on which the checker is built involves three steps:

1. Figure out what each module exports. That requires solving all `import *`
   statements transitively.
2. For each module in isolation, convert it to bindings, dealing with all
   statements and scope information (both static and flow).
3. Solve those bindings, which may require the solutions of bindings in other
   modules.

If we encounter unknowable information (e.g. recursion) we use `Type::Var` to
insert placeholders which are filled in later.

For each module, we solve the steps sequentially and completely. In particular,
we do not try and solve a specific identifier first (like
[Rosyln](https://github.com/dotnet/roslyn) or
[TypeScript](https://www.typescriptlang.org/)), and do not used fine-grained
incrementality (like [Rust Analyzer](https://github.com/rust-lang/rust-analyzer)
using [Salsa](https://github.com/salsa-rs/salsa)). Instead, we aim for raw
performance and a simpler module-centric design - there's no need to solve a
single binding in isolation if solving all bindings in a module is fast enough.

### Example of bindings

Given the program:

```python
1: x: int = 4
2: print(x)
```

We might produce the bindings:

- `define int@0` = `from builtins import int`
- `define x@1` = `4: int@0`
- `use x@2` = `x@1`
- `anon @2` = `print(x@2)`
- `export x` = `x@2`

Of note:

- The keys are things like `define` (the definition of something), `use` (a
  usage of a thing) and `anon` (a statement we need to type check, but don't
  care about the result of).
- In many cases the value of a key refers to other keys.
- Some keys are imported from other modules, via `export` keys and `import`
  values.
- In order to disamiguate identifiers we use the textual position at which they
  occur (in the example I've used `@line`, but in reality its the byte offset in
  the file).

### Example of `Var`

Given the program:

```python
1: x = 1
2: while test():
3:     x = x
4: print(x)
```

We end up with the bindings:

- `x@1` = `1`
- `x@3` = `phi(x@1, x@3)`
- `x@4` = `phi(x@1, x@3)`

The expression `phi` is the join point of the two values, e.g. `phi(int, str)`
would be `int | str`. We skip the distinction between `define` and `use`, since
it is not necessary for this example.

When solving `x@3` we encounter recursion. Operationally:

- We start solving `x@3`.
- That requires us to solve `x@1`.
- We solve `x@1` to be `Literal[1]`
- We start solving `x@3`. But we are currently solving `x@3`, so we invent a
  fresh `Var` (let's call it `?1`) and return that.
- We conclude that `x@3` must be `Literal[1] | ?1`.
- Since `?1` was introduced by `x@3` we record that `?1 = Literal[1] | ?1`. We
  can take the upper reachable bound of that and conclude that
  `?1 = Literal[1]`.
- We simplify `x@3` to just `Literal[1]`.
