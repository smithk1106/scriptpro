# Change Log

All notable changes to the "ScriptPro" extension will be documented in this file.

## [Unreleased]

- Initial release

## [1.0.0] - 2020-01-20
### Added
- ScriptPro script language support.
- Add "Format" and "Run this script" commands
- Add script player for windows 8/10

## [1.0.1] - 2020-01-21
### Added
- Highlight the error line when player failed.
- Added "random" snippet.
### Fixed
- Changed error message for missing include file.
- Mouse action format problem.
- Origin action format problem.

## [1.0.2] - 2020-01-22
### Added
- Added "sound" snippet.
### Fixed
- Random action compile problem.
- "On Error Resume Next" action can't be effected problem.

## [1.0.3] - 2020-01-23
### Added
- Added debug output channel.
- FindModel action can use transparent colors now.
### Fixed
- Correct a format problem for CheckPixel, FindPixel and FindModel actions.

## [1.1.0] - 2020-01-28
### Added
- Added script tool that allow you record actions and get the pixel information from mouse point.
- Added "Open script tool" to context menu.
### Fixed
- Correct image check problem for FindModel action.
- Remove blank lines from debug output.

## [1.1.1] - 2020-01-29
### Added
- Added "Format" action.
- Added "format" snippet.
- Allow "FindModel" action to match image ambiguously.

## [1.1.2] - 2020-01-30
### Added
- Added Settings tab in script tool.
### Fixed
- fiexd type cast problem for "Mouse" action.

## [1.1.3] - 2020-02-02
### Added
- Added "FindPixel" snippet.
### Fixed
- Fixed script tool problem of getting origin information.

## [1.1.4] - 2020-02-10
### Added
- Added "Code" action.
- Added "Code" snippet.
### Fixed
- Fixed a runtime error for "Invoke" action.

## [1.1.5] - 2020-02-10
### Added
- Added following constants for "MsgBox" action.
  - BtnOK
  - BtnOKCancel
  - IconInfo
  - IconWarn
  - IconError
  - IconQuestion
### Fixed
- Fixed error message display problem.

## [1.1.6] - 2020-02-17
### Fixed
- Fixed "ElseIf" can not be highlight problem.
- Fixed "Code" block format problem.

## [1.1.7] - 2020-02-18
### Changed
- Adjusted settings form.
### Fixed
- Modify paramters for "MsgBox" in snippets.
- Fixed format problem for "MsgBox" action
- Fixed the spell miss in console. 

## [1.1.8] - 2020-04-04
### Added
- Added insert origin button and related functions.
