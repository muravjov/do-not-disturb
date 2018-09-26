/* St = Shell Toolkit */
const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

let dndButton;

function init() {}

const Me = imports.misc.extensionUtils.getCurrentExtension();
function iconPath(name) {
  return Me.path + "/" + name;
}

imports.searchPath.unshift(Me.path);
const timeUtils = imports.timeUtils;

const vprintf = imports.format.vprintf;
function sprintf() {
  let args = Array.prototype.slice.call(arguments);
  let fmt = args.shift();
  return vprintf(fmt, args);
}

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
    //icon_name: 'system-search-symbolic',
    style_class: "system-status-icon",
  });

  function updateIcon() {
    // https://www.onlinewebfonts.com/icon/571348
    let iconName = dndOn ? "bell_snoozed.svg" : "bell_normal.svg";
    icon.set_gicon(Gio.icon_new_for_string(iconPath(iconName)));
  }

  // :TODO: show hidden messages count
  //   const Clutter = imports.gi.Clutter;
  //   // A label expanded and center aligned in the y-axis
  //   let toplabel = new St.Label({
  //     text: " Menu ",
  //     y_expand: true,
  //     y_align: Clutter.ActorAlign.CENTER,
  //   });

  box.add(icon);
  //box.add(toplabel);
  //box.add(PopupMenu.arrowIcon(St.Side.BOTTOM));

  dndButton.actor.add_child(box);

  //
  // :TRICKY: I would like create PopupMenu explicitely, without PanelMenu.Button,
  // but something goes wrong last time => should to decompose PanelMenu.Button
  // carefully and deduce how to construct it from ground zero
  //
  // const PopupMenu = imports.ui.popupMenu;
  // let menu = new PopupMenu.PopupMenu(button, 0, St.Side.TOP, 0);
  // const Clutter = imports.gi.Clutter;
  // button.connect("event", function(actor, event) {
  //   if (
  //     event.type() == Clutter.EventType.TOUCH_BEGIN ||
  //     event.type() == Clutter.EventType.BUTTON_PRESS
  //   )
  //     menu.toggle();
  //   return Clutter.EVENT_PROPAGATE;
  // });
  // Main.panel._rightBox.insert_child_at_index(button, 0);

  const Main = imports.ui.main;
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
  let setPresenceStatus;

  const Mainloop = imports.mainloop;
  const GLib = imports.gi.GLib;
  function setDNDState(state, { snoozedSeconds } = { snoozedSeconds: 0 }) {
    dndOn = state;
    updateIcon();
    switchDNDitem.setToggleState(state);

    setPresenceStatus(state);

    if (snoozeTimeoutId != 0) {
      Mainloop.source_remove(snoozeTimeoutId);
      snoozeTimeoutId = 0;
      timeToUnsnoozeFunctor = null;
    }

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
      //log(item.title, item.duration);
      let duration = item.duration;
      //duration /= 60;
      setDNDState(true, { snoozedSeconds: duration });
    });

    dndMenu.addMenuItem(menuItem);
  }

  dndMenu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

  dndMenu.addMenuItem(switchDNDitem);
  switchDNDitem.connect("toggled", function(object, value) {
    //log(value);
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

  setPresenceStatus = presence.trackPresence(onPresenceInit, onPresenceChange);

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

  dndMenu.connect("open-state-changed", function(menu, isOpen) {
    if (isOpen) {
      updateSNLabel();
    }
  });
  // or so
  //let origOpen = dndMenu.open;
  //dndMenu.open = function() {
  //  updateSNLabel();
  //  origOpen.apply(dndMenu, arguments);
  //};
}

function disable() {
  dndButton.destroy();
}
