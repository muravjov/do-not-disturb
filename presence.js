function main() {
  imports.searchPath.unshift(
    "/home/ilya/opt/src/gnome-shell/gnome-shell-3.28.3/js",
  );
  const GnomeSession = imports.misc.gnomeSession;

  let presence = GnomeSession.Presence((proxy, error) => {
    print("oninit", proxy.status, proxy);
  });

  print("list", Object.keys(presence));

  let statusChangedSig = presence.connectSignal(
    "StatusChanged",
    (proxy, senderName, [status]) => {
      print("StatusChanged", proxy.status, proxy, senderName);
    },
  );

  const Mainloop = imports.mainloop;
  const GLib = imports.gi.GLib;
  Mainloop.timeout_add(2 * 1000, function() {
    let status = false
      ? GnomeSession.PresenceStatus.AVAILABLE
      : GnomeSession.PresenceStatus.BUSY;

    print(presence.status, status);

    // *Remote and *Sync are added by _addDBusConvenience(), Gio.js
    presence.SetStatusSync(status);

    print(presence.status, status);

    return GLib.SOURCE_REMOVE;
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
