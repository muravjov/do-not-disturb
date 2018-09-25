const GLib = imports.gi.GLib;

function elapsedSecondsFunctor() {
  let start = GLib.get_monotonic_time();
  return function() {
    return (GLib.get_monotonic_time() - start) / 1000000;
  };
}

function main() {
  log("hello, world");

  log(GLib.get_monotonic_time());

  let esf = elapsedSecondsFunctor();
  const Mainloop = imports.mainloop;
  Mainloop.timeout_add(2 * 1000, function() {
    print(esf());
    Mainloop.quit();

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
