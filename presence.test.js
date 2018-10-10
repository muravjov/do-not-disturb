function main() {
  // :TRICKY: need to manually import GH javascript code,
  // while in /usr/bin/gnome-shell it is as "resource:///org/gnome/shell"
  imports.searchPath.unshift(
    "/home/ilya/opt/src/gnome-shell/gnome-shell-3.28.3/js",
  );

  imports.searchPath.unshift(".");

  function onInit(dndOn) {
    print("onInit", dndOn);
  }

  function onChange(dndOn) {
    print("onChange", dndOn);
  }

  const presence = imports.presence;
  let { setPresenceStatus, disconnect } = presence.trackPresence(
    onInit,
    onChange,
  );

  const Mainloop = imports.mainloop;
  const GLib = imports.gi.GLib;
  let dndOn = false;
  Mainloop.timeout_add(2 * 1000, function() {
    print("setPresenceStatus", dndOn);
    setPresenceStatus(dndOn);
    dndOn = !dndOn;

    return GLib.SOURCE_CONTINUE; // GLib.SOURCE_REMOVE
  });

  Mainloop.run();
}

// :TRICKY: any way to determine this is main/top module, Gjs devs?
let newline = /\r\n|\r|\n/g;
if (
  new Error().stack.split(newline).filter(line => line.length > 0).length == 1
) {
  main();
}
