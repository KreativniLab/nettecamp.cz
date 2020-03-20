# Quality assurance (QA) 

Quality assurance (`binaries`) for your PHP projects

-----

[![Build Status](https://img.shields.io/travis/ninjify/qa.svg?style=flat-square)](https://travis-ci.org/ninjify/qa)
[![Downloads total](https://img.shields.io/packagist/dt/ninjify/qa.svg?style=flat-square)](https://packagist.org/packages/ninjify/qa)
[![Latest stable](https://img.shields.io/packagist/v/ninjify/qa.svg?style=flat-square)](https://packagist.org/packages/ninjify/qa)

## Install

```bash
composer require --dev ninjify/qa
```

## Manual usage (bin)

### CodeSniffer & CodeFixer

Default folders are: `src`, `app`, `tests`
Default extensions are: `php`, `phtml`, `phpt`
Default excluded folders are: `*/temp`, `*/tmp`

By default is used `ruleset.xml` in library/project root of your project. Otherwise, strict default one is used.

```sh
vendor/bin/codesniffer
vendor/bin/codesniffer <folder1> <folder2>
```

```sh
vendor/bin/codefixer
vendor/bin/codefixer <folder1> <folder2>
```

### Linter (PHP)

Default folders are: `src`, `app`, `tests`

```sh
vendor/bin/linter
vendor/bin/linter <folder1> <folder2>
```

### Executing

```
composer qa
composer qa <folder>
composer run qa
composer run-script qa
```

### Composer

```json
{
  "scripts": {
    "qa": [
      "linter src tests",
      "codesniffer src tests"
    ]
  }
}
```

-----

Thanks for testing, reporting and contributing.
