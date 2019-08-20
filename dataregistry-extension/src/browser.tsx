import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from "@jupyterlab/application";
import {
  ICommandPalette,
  MainAreaWidget,
  ReactWidget,
  WidgetTracker
} from "@jupyterlab/apputils";
import { Registry } from "@jupyterlab/dataregistry";

import * as React from "react";
import { IRegistry } from "./registry";
import { widgetDataType } from "./widgets";
import { IActiveDataset } from ".";
import { Widget } from "@phosphor/widgets";
import { PhosphorWidget } from "./utils";

function Browser({
  registry,
  active
}: {
  registry: Registry;
  active: IActiveDataset;
}) {
  const [url, setURL] = React.useState(active.value || "");
  const [label, setLabel] = React.useState("Grid");
  const [submittedURL, setSubmittedURL] = React.useState(url);
  const [submittdLabel, setSubmittedLabel] = React.useState(label);
  const [follow, setFollow] = React.useState(true);
  const [widget, setWidget] = React.useState<Widget | undefined>(undefined);

  React.useEffect(() => {
    if (!submittedURL || !submittdLabel) {
      setWidget(undefined);
      return;
    }
    const widgetCreator = widgetDataType
      .filterDataset(registry.getURL(submittedURL))
      .get(submittdLabel);
    if (widgetCreator) {
      setWidget(widgetCreator());
      return;
    }
    setWidget(undefined);
  }, [submittedURL, submittdLabel, registry]);

  React.useEffect(() => {
    if (follow) {
      const subscription = active.subscribe({
        next: value => {
          setURL(value || "");
          setSubmittedURL(value || "");
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [active, follow]);

  return (
    <div style={{height: "100%"}}>
      <form
        onSubmit={event => {
          setSubmittedLabel(label);
          setSubmittedURL(url);
          event.preventDefault();
        }}
      >
        <label>
          View:
          <input
            type="text"
            value={label}
            onChange={event => setLabel(event.target.value)}
          />
        </label>
        <label>
          URL:
          <input
            type="text"
            value={url}
            onChange={event => setURL(event.target.value)}
          />
        </label>
        <input type="submit" value="Submit" />
      </form>
      <label>
        Follow active?
        <input
          type="checkbox"
          checked={follow}
          onChange={e => {
            if (e.target.checked) {
              setURL(active.value || "");
            }
            setFollow(e.target.checked);
          }}
        />
      </label>
      {widget ? <PhosphorWidget widget={widget} /> : "None"}
    </div>
  );
}

export default {
  activate,
  id: "@jupyterlab/dataregistry-extension:browser",
  requires: [IRegistry, ILayoutRestorer, ICommandPalette, IActiveDataset],
  autoStart: true
} as JupyterFrontEndPlugin<void>;

function activate(
  app: JupyterFrontEnd,
  registry: Registry,
  restorer: ILayoutRestorer,
  palette: ICommandPalette,
  active: IActiveDataset
): void {
  // Declare a widget variable
  let widget: MainAreaWidget<ReactWidget>;

  // Add an application command
  const command: string = "dataregistry-browser:open";
  app.commands.addCommand(command, {
    label: "Data Browser",
    execute: () => {
      if (!widget) {
        // Create a new widget if one does not exist
        const content = ReactWidget.create(
          <Browser registry={registry} active={active} />
        );
        content.addClass("scrollable");
        widget = new MainAreaWidget({ content });
        widget.id = "dataregistry-browser";
        widget.title.label = "Data Browser";
        widget.title.closable = true;
      }
      if (!tracker.has(widget)) {
        // Track the state of the widget for later restoration
        tracker.add(widget);
      }
      if (!widget.isAttached) {
        // Attach the widget to the main work area if it's not there
        app.shell.add(widget, "main");
      }
      widget.content.update();

      // Activate the widget
      app.shell.activateById(widget.id);
    }
  });

  // Add the command to the palette.
  palette.addItem({ command, category: "Data Registry" });

  // Track and restore the widget state
  const tracker = new WidgetTracker<MainAreaWidget<ReactWidget>>({
    namespace: "dataregistry-browser"
  });
  restorer.restore(tracker, {
    command,
    name: () => "dataregistry-browser"
  });
}