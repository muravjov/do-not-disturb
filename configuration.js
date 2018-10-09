const Gio = imports.gi.Gio;

function getSettings(schemaDir) {
  if (!Gio.File.new_for_path(schemaDir).query_exists(null)) {
    throw new Error("DND schema dir " + schemaDir + " not found.");
  }

  let GioSSS = Gio.SettingsSchemaSource;
  // - g_settings_schema_source_new_from_directory(const gchar *directory, GSettingsSchemaSource *parent, gboolean trusted)
  // - requires "gschemas.compiled" in directory
  // - is a special file format, with first bytes "GVariant"
  // - glib-compile-schemas uses gvdb_table_write_contents() to create gschemas.compiled, gio/glib-compile-schemas.c;
  //   too complex to make it yourself, let's store it in repository
  let schemaSrc = GioSSS.new_from_directory(
    schemaDir,
    GioSSS.get_default(),
    false,
  );

  let schema = "org.gnome.shell.extensions.dnd@catbo.net";
  // g_settings_schema_source_lookup(GSettingsSchemaSource *source, const gchar *schema_id, gboolean recursive)
  let schemaObj = schemaSrc.lookup(schema, true);
  if (!schemaObj) throw new Error("Schema " + schema + " not found.");

  // g_settings_new_full (GSettingsSchema *schema, GSettingsBackend *backend, const gchar *path)
  return new Gio.Settings({ settings_schema: schemaObj });
}

function main() {
  let schemaDir = "./schemas";

  imports.searchPath.unshift(".");
  const execCmd = imports.pactl.execCmd;

  execCmd("glib-compile-schemas " + schemaDir);

  let settings = getSettings(schemaDir);

  // dconf-editor
  let muteAudio = settings.get_boolean("mute-audio");
  log(muteAudio);
  // /org/gnome/shell/extensions/dnd@catbo.net/
  log(settings.path);
  // org.gnome.shell.extensions.dnd@catbo.net
  log(settings.schema);
  // DConfSettingsBackend
  log(settings.backend);

  settings.connect("changed::mute-audio", function() {
    log("ups!");
  });

  const GLib = imports.gi.GLib;
  const Mainloop = imports.mainloop;
  Mainloop.timeout_add(2 * 1000, function() {
    settings.set_boolean("mute-audio", !muteAudio);

    Mainloop.quit();
    return GLib.SOURCE_REMOVE;
  });
  Mainloop.run();
}

if (
  new Error().stack.split(/\r\n|\r|\n/g).filter(line => line.length > 0)
    .length == 1
) {
  main();
}
