# Change Log

All notable changes to the "mux" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## 0.6.0

Choo choo, here we come on the 1.0 train

- Added basic window navigation commands (still a few bugs)
- Added support for named panes (doesn't reflect in nav commands yet)
- Moved to a provider model
- Added basic screen support

## 0.5.0

Almost ready for 1.0

- Fixed bug at startup (so this actually _works_ now)
- Cleaned up some function calls
- Added calls more to OutputChannel
- Cleaned up activate logic

## 0.4.0

Simple navigation commands

- Added support for moving to *most and navigation to panes
- Cleaned up types
- Moved `projectConfiguration` to a file (global will still be a config object)
- Added a few bugs with settings (should be cleaned up soon)

## 0.3.0

Mostly docs and a few bug fixes

- Fixed #2
- Fixed bug with project configuration not being updated unless window is reloaded
- Documented functions

## 0.2.0

Published the wrong version

## 0.0.1

Initial release, _very_ basic functionality.

- Able to describe a simple layout
- Simple session management (create/attach, kill current, kill with prefix)
- Settings support

## [Unreleased]

- Add support for screen
- SSH loading/attaching to pre-existing user-defined sessions
- Multiple sessions per project
- Tests