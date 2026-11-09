# @runa-cmd/create

## 0.2.0-beta.7

### Minor Changes

- 4140fe9: The generator's command line follows the rules of a CLI made with Runa. A usage error exits with 2, says what's wrong in its own words, and where the help is:

  ```
  $ npm create @runa-cmd
  Missing the name of the project, as in 'npm create @runa-cmd my-tool'.
  Run 'npm create @runa-cmd -- --help' for usage.
  ```

  Before, a missing name or an extra argument printed the usage without saying what was wrong, and an unknown option showed Node's text. The README lists its arguments and exit codes, and says that npm reads its own flags first, so `--help` and `--version` go after `--`.

  **Breaking:** `-v` is gone, as in every Runa CLI, where it's left for `--verbose`. Use `--version`.

## 0.2.0-beta.6

## 0.2.0-beta.5

### Minor Changes

- ba3be24: New package: `npm create @runa-cmd@beta my-tool` creates a CLI ready to run, test and build. It makes the project of the getting started guide, named after yours, and installs nothing on its own.
