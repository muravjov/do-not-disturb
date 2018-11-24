# Do Not Disturb Time

Do Not Disturb Time is Gnome Shell Extension.

Disables notifications and audio for a period. You can snooze notifications like in Slack! :bell: :no_bell:

![Do Not Disturb Time](https://github.com/muravjov/do-not-disturb/raw/master/screenshot.png)

## Installation

1.  Install GNOME Shell integration for Chrome browser, https://wiki.gnome.org/Projects/GnomeShellIntegrationForChrome/Installation
2.  Open https://extensions.gnome.org/ in Chrome browser and search "Do Not Disturb Time"
3.  Install it, enable/disable at https://extensions.gnome.org/local/

## Install from scratch

To install, clone this repo

```shell
$ mkdir -p ~/.local/share/gnome-shell/extensions/do-not-disturb-time@catbo.net
$ cd ~/.local/share/gnome-shell/extensions/do-not-disturb-time@catbo.net
$ git clone https://github.com/muravjov/do-not-disturb.git .
```

, and enable it https://extensions.gnome.org/local/ . To restart GNOME Shell, use "Alt+F2, r, Enter".

## Changelog

### 1.1.0 (November 24, 2018)

* Setting "show-number-of-notifications". ([@muravjov](https://github.com/muravjov) in [#2](https://github.com/muravjov/do-not-disturb/issues/2))
* Configure middleclick to toggle dnd state. ([@goodwillcoding](https://github.com/goodwillcoding) in [#1](https://github.com/muravjov/do-not-disturb/pull/1))

### 1.0.0 (October 11, 2018)

* Initial public release

## Development

```shell
# compile gsettings' schema
$ glib-compile-schemas ./schemas/

# see gnome-shell logs
$ journalctl -f /usr/bin/gnome-shell | grep -E 'dnd|$'

# package it
git archive --format=zip HEAD > ../do-not-disturb-time.zip

# see commit id, written as "zip comment"
unzip -z ../do-not-disturb-time.zip
```
