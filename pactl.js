// :TRICKY: any way to determine this is main/top module, Gjs devs?
if (
  new Error().stack.split(/\r\n|\r|\n/g).filter(line => line.length > 0)
    .length == 1
) {
  imports.searchPath.unshift(".");
}

const GLib = imports.gi.GLib;
const sprintf = imports.sprintf.sprintf;

function execCmd(cmd) {
  print("execCmd:", cmd);

  let resList = GLib.spawn_command_line_sync(cmd);
  let [res, out, err, status] = resList;
  if (res != true || status != 0) {
    print(
      "spawn_sync failed:",
      cmd,
      JSON.stringify({
        res,
        out: out.toString(),
        err: err.toString(),
        status,
      }),
    );
    return;
  }
  return resList;
}

function getDefaultSink() {
  let failRes = [null, false];

  let resList = execCmd("pactl info");
  if (!resList) {
    return failRes;
  }
  let [res, out, err, status] = resList;

  // $ grep -R -C 2 --include='*.c*' "Default Sink: " .
  // ./src/utils/pactl.c-             "Default Sample Specification: %s\n"
  // ./src/utils/pactl.c-             "Default Channel Map: %s\n"
  // ./src/utils/pactl.c:             "Default Sink: %s\n"
  // ./src/utils/pactl.c-             "Default Source: %s\n"
  // ./src/utils/pactl.c-             "Cookie: %04x:%04x\n"),
  let pattern = /^Default Sink: (.*)$/m;

  let m = pattern.exec(out.toString());
  if (!m || m.length < 2) {
    print("Can't find default sink (sound output) via pactl");
    return failRes;
  }

  return [m[1], true];
}

function doMute(defaultSink, isMute) {
  let resList = execCmd(
    sprintf("pactl set-sink-mute %s %s", defaultSink, isMute),
  );
  if (!resList) {
    return;
  }
}

function muteAudio() {
  let nullUnmute = null;

  let [defaultSink, ok] = getDefaultSink();
  if (!ok) {
    return nullUnmute;
  }

  let [muted, ok2] = isMuted(defaultSink);
  if (!ok2) {
    return nullUnmute;
  }

  if (muted) {
    return nullUnmute;
  }

  doMute(defaultSink, true);
  return function() {
    let [defaultSink, ok] = getDefaultSink();
    if (!ok) {
      return;
    }

    doMute(defaultSink, false);
  };
}

function isMuted(defaultSink) {
  let failRes = [null, false];

  let resList = execCmd("pactl list sinks");
  if (!resList) {
    return failRes;
  }
  let [res, out, err, status] = resList;

  // $ grep -R -B 10 --include='*.c*' 'Mute: ' .
  // ./src/utils/pactl.c-    }
  // ./src/utils/pactl.c-
  // ./src/utils/pactl.c-    printf(_("Sink #%u\n"
  // ./src/utils/pactl.c-             "\tState: %s\n"
  // ./src/utils/pactl.c-             "\tName: %s\n"
  // ./src/utils/pactl.c-             "\tDescription: %s\n"
  // ./src/utils/pactl.c-             "\tDriver: %s\n"
  // ./src/utils/pactl.c-             "\tSample Specification: %s\n"
  // ./src/utils/pactl.c-             "\tChannel Map: %s\n"
  // ./src/utils/pactl.c-             "\tOwner Module: %u\n"
  // ./src/utils/pactl.c:             "\tMute: %s\n"

  // [\\s\\S] = /[\s\S]/ - ". + \n"
  // *? - non-greedy search
  let pattern = new RegExp(
    sprintf("Name: %s[\\s\\S]*?\tMute: (yes|no)", defaultSink),
    "m",
  );

  let m = pattern.exec(out.toString());
  if (!m || m.length < 2) {
    print("Can't find muteness via pactl");
    return failRes;
  }

  return [m[1] == "yes", true];
}

function main() {
  //print(GLib.spawn_sync);
  //print(GLib.spawn_command_line_sync);

  if (false) {
    var [defaultSink, ok] = getDefaultSink();
    if (!ok) {
      return;
    }

    print(isMuted(defaultSink));
  }

  if (true) {
    let unMuteAudio = muteAudio();

    const Mainloop = imports.mainloop;
    Mainloop.timeout_add(2 * 1000, function() {
      if (unMuteAudio) {
        unMuteAudio();
      }

      return GLib.SOURCE_REMOVE;
    });
    Mainloop.run();
  }
}

if (
  new Error().stack.split(/\r\n|\r|\n/g).filter(line => line.length > 0)
    .length == 1
) {
  main();
}
