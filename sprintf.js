const vprintf = imports.format.vprintf;
function sprintf() {
  let args = Array.prototype.slice.call(arguments);
  let fmt = args.shift();
  return vprintf(fmt, args);
}
