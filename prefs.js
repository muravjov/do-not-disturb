const Gtk = imports.gi.Gtk;

const Gettext = imports.gettext.domain("dnd@catbo.net");
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
imports.searchPath.unshift(Me.path);

// required, otherwise:
// TypeError: prefsModule.init is not a function
//
// Stack trace:
//  _getExtensionPrefsModule@resource:///org/gnome/shell/extensionPrefs/main.js:76:9
// ...
function init() {}

function buildPrefsWidget() {
  let notebook = new Gtk.Notebook();

  let frame = new Gtk.VBox({ border_width: 10, spacing: 6 });
  notebook.append_page(
    frame,
    new Gtk.Label({
      label: _("Settings"),
      use_markup: true,
      //xalign: 0,
    }),
  );

  // :TRICKY: section title is not needed for one setting
  //   frame.pack_start(
  //     new Gtk.Label({
  //       label: _("<b>Title</b>"),
  //       use_markup: true,
  //       xalign: 0,
  //     }),
  //     false,
  //     false,
  //     0,
  //   );

  let settings_vbox = new Gtk.VBox({
    margin_left: 20,
    margin_top: 10,
    spacing: 6,
  });
  // gtk_box_pack_start (GtkBox *box, GtkWidget *child, gboolean expand, gboolean fill, guint padding);
  frame.pack_start(settings_vbox, true, true, 0);

  let settings = imports.configuration.getSettings(
    Me.dir.get_child("schemas").get_path(),
  );

  function appendBoolean(storageName, label) {
    settings_onoff = new Gtk.Switch({
      active: settings.get_boolean(storageName),
    });
    settings_onoff.connect("notify::active", function(w) {
      settings.set_boolean(storageName, w.active);
    });
    settings.connect("changed::" + storageName, function(k, b) {
      settings_onoff.set_active(settings.get_boolean(b));
    });

    settings_hbox = new Gtk.HBox();
    settings_hbox.pack_start(
      new Gtk.Label({
        label: label,
        use_markup: true,
        xalign: 0,
      }),
      true,
      true,
      0,
    );
    settings_hbox.pack_end(settings_onoff, false, false, 0);

    settings_vbox.pack_start(settings_hbox, false, false, 0);
  }

  appendBoolean("mute-audio", _("Mute audio while do-not-disturb period"));
  appendBoolean("show-number-of-notifications", _("Show the number of notifications"));

  // About
  {
    let frame = new Gtk.VBox({ border_width: 10 });

    notebook.append_page(
      frame,
      new Gtk.Label({
        label: _("About"),
        use_markup: true,
      }),
    );

    frame.pack_start(
      new Gtk.Label({
        label: "<b>Do Not Disturb Time</b>",
        use_markup: true,
      }),
      true,
      true,
      0,
    );

    function appendLabel(text) {
      frame.pack_start(
        new Gtk.Label({
          label: text,
          use_markup: true,
        }),
        false,
        false,
        10,
      );
    }

    appendLabel(
      'Created by <a href="mailto:muravev@yandex.ru">Ilya Murav\'jov</a> 2018 ©',
    );
    appendLabel(
      '<a href="https://github.com/muravjov/do-not-disturb">Webpage</a>',
    );
    appendLabel(`<small>This program comes with absolutely no warranty.
See the <a href="https://www.gnu.org/licenses/old-licenses/gpl-2.0.html">GNU General Public License, version 2 or later</a> for details.</small>`);
  }

  notebook.show_all();
  return notebook;
}
