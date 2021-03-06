yengen
======



[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/yengen.svg)](https://npmjs.org/package/yengen)
[![Codecov](https://codecov.io/gh/WebstormProjects/yengen/branch/master/graph/badge.svg)](https://codecov.io/gh/WebstormProjects/yengen)
[![Downloads/week](https://img.shields.io/npm/dw/yengen.svg)](https://npmjs.org/package/yengen)
[![License](https://img.shields.io/npm/l/yengen.svg)](https://github.com/WebstormProjects/yengen/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g yengen
$ yengen COMMAND
running command...
$ yengen (-v|--version|version)
yengen/0.2.0 linux-x64 node-v10.16.0
$ yengen --help [COMMAND]
USAGE
  $ yengen COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`yengen generate [FILE]`](#yengen-generate-file)
* [`yengen help [COMMAND]`](#yengen-help-command)
* [`yengen new:project DIRPATH`](#yengen-newproject-dirpath)

## `yengen generate [FILE]`

describe the command here

```
USAGE
  $ yengen generate [FILE]

ARGUMENTS
  FILE  [default: ./generate.ts] OpenAPI file location

OPTIONS
  -h, --help  show CLI help
```

_See code: [lib/commands/generate.js](https://github.com/janexpando/yengen/blob/v0.2.0/lib/commands/generate.js)_

## `yengen help [COMMAND]`

display help for yengen

```
USAGE
  $ yengen help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.0/src/commands/help.ts)_

## `yengen new:project DIRPATH`

describe the command here

```
USAGE
  $ yengen new:project DIRPATH

OPTIONS
  -h, --help  show CLI help
```

_See code: [lib/commands/new/project.js](https://github.com/janexpando/yengen/blob/v0.2.0/lib/commands/new/project.js)_
<!-- commandsstop -->

#TODO:
Correctly generate oneOf types
