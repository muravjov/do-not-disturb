//
// This file is part of Do Not Disturb Time, GNOME Shell extension.
// Copyright (C) 2018 Ilya Murav'jov <muravev@yandex.ru>
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//

/* St = Shell Toolkit */
const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

let dndButton;

function init() {}

const Me = imports.misc.extensionUtils.getCurrentExtension();
function expandLocalPath(name) {
  return Me.path + "/" + name;
}

imports.searchPath.unshift(Me.path);
const timeUtils = imports.timeUtils;

const sprintf = imports.sprintf.sprintf;

function enable() {
  let dndOn = false;
  let snoozedSeconds = 3700;

  /* 
    This is calling the parent constructor
    1 is the menu alignment (1 is left, 0 is right, 0.5 is centered)
    `DoNotDisturb` is the name
    true if you want to create a menu automatically, otherwise false
    */
  dndButton = new PanelMenu.Button(1, "DoNotDisturb", false);

  // We are creating a box layout with shell toolkit
  let box = new St.BoxLayout();

  const Gio = imports.gi.Gio;
  let icon = new St.Icon({
    style_class: "system-status-icon",
  });

  function updateIcon() {
    // https://www.onlinewebfonts.com/icon/571348
    let iconName = dndOn ? "bell_snoozed.svg" : "bell_normal.svg";
    icon.set_gicon(Gio.icon_new_for_string(expandLocalPath(iconName)));
  }

  const Clutter = imports.gi.Clutter;
  // A label expanded and center aligned in the y-axis
  let notificationsCount = new St.Label({
    text: "0",
    y_align: Clutter.ActorAlign.CENTER,
  });

  const Main = imports.ui.main;
  let unseenlist =
    Main.panel.statusArea.dateMenu._messageList._notificationSection._list;
  function onNotification() {
    let number = unseenlist.get_n_children();
    if (number != 0) {
      notificationsCount.set_text(number.toString());
      notificationsCount.show();
    } else {
      notificationsCount.hide();
    }
  }
  onNotification();

  let connectedSignalList = [];
  function connectSignal(container, signalName, cb) {
    let signal = container.connect(signalName, cb);
    connectedSignalList.push(function() {
      container.disconnect(signal);
    });
  }

  connectSignal(unseenlist, "actor-added", onNotification);
  connectSignal(unseenlist, "actor-removed", onNotification);

  box.add(icon);
  box.add(notificationsCount);
  //box.add(PopupMenu.arrowIcon(St.Side.BOTTOM));

  dndButton.actor.add_child(box);

  /* 
	In here we are adding the button in the status area
	- `DoNotDisturbRole` is tha role, must be unique. You can access it from the Looking Glass  in 'Main.panel.statusArea.DoNotDisturbRole`
	- button is and instance of panelMenu.Button
	- 0 is the position
	- `right` is the box where we want our button to be displayed (left/center/right)
	 */
  Main.panel.addToStatusArea("DoNotDisturbRole", dndButton, 0, "right");

  // Menu
  let dndMenu = dndButton.menu;

  let defaultSnoozeText = "Snooze notifications";

  const snLabel = new St.Label({
    text: defaultSnoozeText,
    style: "margin: 10px; font-size: smaller",
  });
  // PopupMenu expects all children have _delegate
  snLabel._delegate = null;
  dndMenu.box.add(snLabel);

  const snoozeList = [
    {
      title: "20 minutes",
      duration: 20 * 60,
    },
    {
      title: "1 hour",
      duration: 60 * 60,
    },
    {
      title: "2 hours",
      duration: 2 * 60 * 60,
    },
    {
      title: "4 hours",
      duration: 4 * 60 * 60,
    },
    {
      title: "8 hours",
      duration: 8 * 60 * 60,
    },
    {
      title: "24 hours",
      duration: 24 * 60 * 60,
    },
  ];

  let switchDNDitem = new PopupMenu.PopupSwitchMenuItem(
    "Do not disturb",
    false,
  );

  let snoozeTimeoutId = 0;
  let timeToUnsnoozeFunctor; // seconds before setDNDState(false)
  function removeSnoozeTimer() {
    if (snoozeTimeoutId != 0) {
      Mainloop.source_remove(snoozeTimeoutId);
      snoozeTimeoutId = 0;
      timeToUnsnoozeFunctor = null;
    }
  }

  let setPresenceStatus;

  let unMuteAudio = null;
  function restoreAudio() {
    if (unMuteAudio) {
      let uma = unMuteAudio;
      unMuteAudio = null;
      uma();
    }
  }

  const pactl = imports.pactl;

  let settings = imports.configuration.getSettings(expandLocalPath("schemas"));

  const Mainloop = imports.mainloop;
  const GLib = imports.gi.GLib;
  function setDNDState(state, { snoozedSeconds } = { snoozedSeconds: 0 }) {
    dndOn = state;
    updateIcon();
    switchDNDitem.setToggleState(state);

    setPresenceStatus(state);

    if (state) {
      // leave audio untouched if previous unMuteAudio exists,-
      // it knows what to do better
      if (!unMuteAudio && settings.get_boolean("mute-audio")) {
        unMuteAudio = pactl.muteAudio();
      }
    } else {
      restoreAudio();
    }

    removeSnoozeTimer();

    if (state && snoozedSeconds > 0) {
      let esf = timeUtils.elapsedSecondsFunctor();
      timeToUnsnoozeFunctor = function() {
        //print(esf(), "ggg");
        return snoozedSeconds - esf();
      };
      snoozeTimeoutId = Mainloop.timeout_add(snoozedSeconds * 1000, function() {
        setDNDState(false);

        return GLib.SOURCE_REMOVE;
      });
    }
  }

  for (const item of snoozeList) {
    let menuItem = new PopupMenu.PopupMenuItem(item.title);
    menuItem.connect("activate", (menuItem, event) => {
      let duration = item.duration;
      //duration /= 60;
      setDNDState(true, { snoozedSeconds: duration });
    });

    dndMenu.addMenuItem(menuItem);
  }

  dndMenu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

  dndMenu.addMenuItem(switchDNDitem);
  switchDNDitem.connect("toggled", function(object, value) {
    setDNDState(value);
  });

  // to set up initial state
  //setDNDState(false);
  //
  // 1. wait for initial state and set it as is
  const presence = imports.presence;
  function onPresenceInit(remotedndOn) {
    setDNDState(remotedndOn);
  }
  // 2. if our state differ from real one we suppose that
  // somethins else change it, so we sync
  function onPresenceChange(remotedndOn) {
    if (remotedndOn != dndOn) {
      setDNDState(remotedndOn);
    }
  }

  let tpContext = presence.trackPresence(onPresenceInit, onPresenceChange);
  setPresenceStatus = tpContext.setPresenceStatus;

  function updateSNLabel() {
    let snoozeText = defaultSnoozeText;
    (function() {
      if (snoozeTimeoutId == 0) return;

      let rest = Math.round(timeToUnsnoozeFunctor());
      if (rest < 0) return;

      function divmod(val, by) {
        rest = val % by;
        return [(val - rest) / by, rest];
      }

      let list = [];
      function appendPeriod(by, postfix) {
        let [div, rest2] = divmod(rest, by);
        if (div > 0) {
          list.push(sprintf("%d%s", div, postfix));
        }

        rest = rest2;
        return rest == 0;
      }

      (function() {
        if (appendPeriod(24 * 60 * 60, "d")) return;
        if (appendPeriod(60 * 60, "h")) return;
        if (appendPeriod(60, "m")) return;
        list.push(rest + "s");
      })();

      snoozeText = sprintf("Notifications snoozed for %s", list.join(" "));
    })();

    snLabel.set_text(snoozeText);
  }

  // configure middle click to toggle the dnd state
  dndButton.actor.connect('button-press-event',  function(actor, event) {
    let button = event.get_button();
    if (button == 2) {
      if (dndMenu.isOpen) {
        dndMenu.close();
      }
      setDNDState(!dndOn);
    };
  });

  dndMenu.connect("open-state-changed", function(menu, isOpen) {
    if (isOpen) {
      updateSNLabel();
    }
  });

  dndMenu.connect("destroy", function(menu) {
    // :TRICKY: we cannot just setDNDState(false) because UI has already destroyed
    //setDNDState(false);
    removeSnoozeTimer();
    restoreAudio();

    tpContext.disconnect();

    for (const disconnect of connectedSignalList) {
      disconnect();
    }
  });
}

function disable() {
  dndButton.destroy();
}
