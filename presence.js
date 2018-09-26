const GnomeSession = imports.misc.gnomeSession;

function status2DND(status) {
  return status == GnomeSession.PresenceStatus.BUSY;
}

//
// This is async API, even initial state is being got async way (onInit):
// - SetStatusSync is really Gio.DBusProxy.call_sync() = g_dbus_proxy_call_sync(),
//   but don't know how to get result sync, without connectSignal("StatusChanged")
// - .status attribute is useless; really it calls g_dbus_proxy_get_cached_property(),
//   and it stores not actual, but some stale value
// - really flag GnomeSession.Presence = "/org/gnome/SessionManager/Presence"' interface is handled in gnome-session
//   package, and it is just a .status attribute (guint) in GsmPresencePrivate, gnome-session/gsm-presence.c

function trackPresence(onInit, onChange) {
  let presence = GnomeSession.Presence((proxy, error) => {
    let dndOn = false;
    if (error) {
      logError(error, "Can't get initial value of GnomeSession.Presence");
    } else {
      dndOn = status2DND(proxy.status);
    }

    //print("oninit", proxy.status, proxy, error);
    onInit(dndOn);
  });

  // SetStatusRemote,SetStatusSync,status
  //print("list", Object.keys(presence));
  // always null
  //print("value", presence.status);

  presence.connectSignal("StatusChanged", (proxy, senderName, [status]) => {
    //print("StatusChanged", proxy.status, status, senderName);
    onChange(status2DND(status));
  });

  function setPresenceStatus(dndOn) {
    let status = dndOn
      ? GnomeSession.PresenceStatus.BUSY
      : GnomeSession.PresenceStatus.AVAILABLE;

    // *Remote and *Sync are added by _addDBusConvenience(), Gio.js
    presence.SetStatusRemote(status);
  }

  return setPresenceStatus;
}
