SmartThings Edge CLI Plugin
===========================

This is the home of the SmartThings CLI plugin for Edge Drivers. While it is a plugin with a
separate code base, it is installed by default with the SmartThings CLI. No additional setup is
necessary to begin using the Edge CLI plugin with the SmartThings CLI.


<!-- toc -->
* [Using](#using)
* [Commands](#commands)
* [Building](#building)
<!-- tocstop -->

# Using

See the [README for the CLI](https://github.com/SmartThingsCommunity/smartthings-cli/blob/master/packages/cli/README.md)
for information on running the CLI.

# Commands

<!-- commands -->
* [`smartthings edge:channels [IDORINDEX]`](#smartthings-edgechannels-idorindex)
* [`smartthings edge:channels:assign [DRIVERID] [VERSION]`](#smartthings-edgechannelsassign-driverid-version)
* [`smartthings edge:channels:create`](#smartthings-edgechannelscreate)
* [`smartthings edge:channels:delete [ID]`](#smartthings-edgechannelsdelete-id)
* [`smartthings edge:channels:drivers [IDORINDEX]`](#smartthings-edgechannelsdrivers-idorindex)
* [`smartthings edge:channels:enroll [HUBID]`](#smartthings-edgechannelsenroll-hubid)
* [`smartthings edge:channels:enrollments [IDORINDEX]`](#smartthings-edgechannelsenrollments-idorindex)
* [`smartthings edge:channels:invites [IDORINDEX]`](#smartthings-edgechannelsinvites-idorindex)
* [`smartthings edge:channels:invites:accept ID`](#smartthings-edgechannelsinvitesaccept-id)
* [`smartthings edge:channels:invites:create`](#smartthings-edgechannelsinvitescreate)
* [`smartthings edge:channels:invites:delete [ID]`](#smartthings-edgechannelsinvitesdelete-id)
* [`smartthings edge:channels:unassign [DRIVERID]`](#smartthings-edgechannelsunassign-driverid)
* [`smartthings edge:channels:unenroll [HUBID]`](#smartthings-edgechannelsunenroll-hubid)
* [`smartthings edge:channels:update [ID]`](#smartthings-edgechannelsupdate-id)
* [`smartthings edge:drivers [IDORINDEX]`](#smartthings-edgedrivers-idorindex)
* [`smartthings edge:drivers:delete [ID]`](#smartthings-edgedriversdelete-id)
* [`smartthings edge:drivers:install [DRIVERID]`](#smartthings-edgedriversinstall-driverid)
* [`smartthings edge:drivers:installed [IDORINDEX]`](#smartthings-edgedriversinstalled-idorindex)
* [`smartthings edge:drivers:logcat [DRIVERID]`](#smartthings-edgedriverslogcat-driverid)
* [`smartthings edge:drivers:package [PROJECTDIRECTORY]`](#smartthings-edgedriverspackage-projectdirectory)
* [`smartthings edge:drivers:uninstall [DRIVERID]`](#smartthings-edgedriversuninstall-driverid)

## `smartthings edge:channels [IDORINDEX]`

list all channels owned by you or retrieve a single channel

```
USAGE
  $ smartthings edge:channels [IDORINDEX]

ARGUMENTS
  IDORINDEX  the channel id or number in list

OPTIONS
  -I, --include-read-only  include subscribed-to channels as well as owned channels
  -h, --help               show CLI help
  -j, --json               use JSON format of input and/or output
  -o, --output=output      specify output file
  -p, --profile=profile    [default: default] configuration profile
  -t, --token=token        the auth token to use
  -y, --yaml               use YAML format of input and/or output
  --compact                use compact table format with no lines between body rows
  --expanded               use expanded table format with a line between each body row
  --indent=indent          specify indentation for formatting JSON or YAML output
  --language=language      ISO language code or "NONE" to not specify a language. Defaults to the OS locale

EXAMPLE
  # list all user-owned channels
  $ smartthings edge:channels

  # list user-owned and subscribed channels
  $ smartthings edge:channels --include-read-only

  # display details about the second channel listed when running "smartthings edge:channels"
  $ smartthings edge:channels 2
```

_See code: [src/commands/edge/channels.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/channels.ts)_

## `smartthings edge:channels:assign [DRIVERID] [VERSION]`

assign a driver to a channel

```
USAGE
  $ smartthings edge:channels:assign [DRIVERID] [VERSION]

ARGUMENTS
  DRIVERID  driver id
  VERSION   driver version

OPTIONS
  -C, --channel=channel  channel id
  -h, --help             show CLI help
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale

ALIASES
  $ smartthings edge:drivers:publish
```

_See code: [src/commands/edge/channels/assign.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/channels/assign.ts)_

## `smartthings edge:channels:create`

create a channel

```
USAGE
  $ smartthings edge:channels:create

OPTIONS
  -d, --dry-run          produce JSON but don't actually submit
  -h, --help             show CLI help
  -i, --input=input      specify input file
  -j, --json             use JSON format of input and/or output
  -o, --output=output    specify output file
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  -y, --yaml             use YAML format of input and/or output
  --compact              use compact table format with no lines between body rows
  --expanded             use expanded table format with a line between each body row
  --indent=indent        specify indentation for formatting JSON or YAML output
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale
```

_See code: [src/commands/edge/channels/create.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/channels/create.ts)_

## `smartthings edge:channels:delete [ID]`

delete a channel

```
USAGE
  $ smartthings edge:channels:delete [ID]

ARGUMENTS
  ID  channel id

OPTIONS
  -h, --help             show CLI help
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale
```

_See code: [src/commands/edge/channels/delete.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/channels/delete.ts)_

## `smartthings edge:channels:drivers [IDORINDEX]`

list all drivers assigned to a given channel

```
USAGE
  $ smartthings edge:channels:drivers [IDORINDEX]

ARGUMENTS
  IDORINDEX  the channel id or number in list

OPTIONS
  -h, --help             show CLI help
  -j, --json             use JSON format of input and/or output
  -o, --output=output    specify output file
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  -y, --yaml             use YAML format of input and/or output
  --compact              use compact table format with no lines between body rows
  --expanded             use expanded table format with a line between each body row
  --indent=indent        specify indentation for formatting JSON or YAML output
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale

ALIASES
  $ smartthings edge:channels:assignments
```

_See code: [src/commands/edge/channels/drivers.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/channels/drivers.ts)_

## `smartthings edge:channels:enroll [HUBID]`

enroll a hub in a channel

```
USAGE
  $ smartthings edge:channels:enroll [HUBID]

ARGUMENTS
  HUBID  hub id

OPTIONS
  -C, --channel=channel  channel id
  -h, --help             show CLI help
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale
```

_See code: [src/commands/edge/channels/enroll.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/channels/enroll.ts)_

## `smartthings edge:channels:enrollments [IDORINDEX]`

list all channels a given hub is enrolled in

```
USAGE
  $ smartthings edge:channels:enrollments [IDORINDEX]

ARGUMENTS
  IDORINDEX  the hub id or number in list

OPTIONS
  -h, --help             show CLI help
  -j, --json             use JSON format of input and/or output
  -o, --output=output    specify output file
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  -y, --yaml             use YAML format of input and/or output
  --compact              use compact table format with no lines between body rows
  --expanded             use expanded table format with a line between each body row
  --indent=indent        specify indentation for formatting JSON or YAML output
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale
```

_See code: [src/commands/edge/channels/enrollments.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/channels/enrollments.ts)_

## `smartthings edge:channels:invites [IDORINDEX]`

list invitations or retrieve a single invitation by id or index

```
USAGE
  $ smartthings edge:channels:invites [IDORINDEX]

ARGUMENTS
  IDORINDEX  the invitation id or number in list

OPTIONS
  -C, --channel=channel  channel id
  -h, --help             show CLI help
  -j, --json             use JSON format of input and/or output
  -o, --output=output    specify output file
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  -y, --yaml             use YAML format of input and/or output
  --compact              use compact table format with no lines between body rows
  --expanded             use expanded table format with a line between each body row
  --indent=indent        specify indentation for formatting JSON or YAML output
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale

ALIASES
  $ smartthings edge:channels:invitations

EXAMPLES
  smartthings edge:channels:invites                  # list all invites on all channels you own
  smartthings edge:channels:invites 2                # list details about the second invite show when listed as in the 
  example above
  smartthings edge:channels:invites -C <channel id>  # list all invites on channel with id <channel id>
  smartthings edge:channels:invites <invite id>      # list details about the invite with id <invite id>
```

_See code: [src/commands/edge/channels/invites.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/channels/invites.ts)_

## `smartthings edge:channels:invites:accept ID`

accept a channel invitation

```
USAGE
  $ smartthings edge:channels:invites:accept ID

ARGUMENTS
  ID  invite UUID

OPTIONS
  -h, --help             show CLI help
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale

ALIASES
  $ smartthings edge:channels:invitations:accept
```

_See code: [src/commands/edge/channels/invites/accept.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/channels/invites/accept.ts)_

## `smartthings edge:channels:invites:create`

create an invitation

```
USAGE
  $ smartthings edge:channels:invites:create

OPTIONS
  -C, --channel=channel  channel id
  -d, --dry-run          produce JSON but don't actually submit
  -h, --help             show CLI help
  -i, --input=input      specify input file
  -j, --json             use JSON format of input and/or output
  -o, --output=output    specify output file
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  -y, --yaml             use YAML format of input and/or output
  --compact              use compact table format with no lines between body rows
  --expanded             use expanded table format with a line between each body row
  --indent=indent        specify indentation for formatting JSON or YAML output
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale

ALIASES
  $ smartthings edge:channels:invitations:create
```

_See code: [src/commands/edge/channels/invites/create.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/channels/invites/create.ts)_

## `smartthings edge:channels:invites:delete [ID]`

delete a channel invitation

```
USAGE
  $ smartthings edge:channels:invites:delete [ID]

ARGUMENTS
  ID  invitation UUID

OPTIONS
  -C, --channel=channel  channel id
  -h, --help             show CLI help
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale

ALIASES
  $ smartthings edge:channels:invitations:revoke
  $ smartthings edge:channels:invitations:delete
  $ smartthings edge:channels:invites:revoke
```

_See code: [src/commands/edge/channels/invites/delete.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/channels/invites/delete.ts)_

## `smartthings edge:channels:unassign [DRIVERID]`

remove a driver from a channel

```
USAGE
  $ smartthings edge:channels:unassign [DRIVERID]

ARGUMENTS
  DRIVERID  driver id

OPTIONS
  -C, --channel=channel  channel id
  -h, --help             show CLI help
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale

ALIASES
  $ smartthings edge:drivers:unpublish
```

_See code: [src/commands/edge/channels/unassign.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/channels/unassign.ts)_

## `smartthings edge:channels:unenroll [HUBID]`

unenroll a hub from a channel

```
USAGE
  $ smartthings edge:channels:unenroll [HUBID]

ARGUMENTS
  HUBID  hub id

OPTIONS
  -C, --channel=channel  channel id
  -h, --help             show CLI help
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale
```

_See code: [src/commands/edge/channels/unenroll.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/channels/unenroll.ts)_

## `smartthings edge:channels:update [ID]`

update a channel

```
USAGE
  $ smartthings edge:channels:update [ID]

ARGUMENTS
  ID  the channel id

OPTIONS
  -d, --dry-run          produce JSON but don't actually submit
  -h, --help             show CLI help
  -i, --input=input      specify input file
  -j, --json             use JSON format of input and/or output
  -o, --output=output    specify output file
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  -y, --yaml             use YAML format of input and/or output
  --compact              use compact table format with no lines between body rows
  --expanded             use expanded table format with a line between each body row
  --indent=indent        specify indentation for formatting JSON or YAML output
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale
```

_See code: [src/commands/edge/channels/update.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/channels/update.ts)_

## `smartthings edge:drivers [IDORINDEX]`

list all drivers available in a user account or retrieve a single driver

```
USAGE
  $ smartthings edge:drivers [IDORINDEX]

ARGUMENTS
  IDORINDEX  the driver id or number in list

OPTIONS
  -h, --help             show CLI help
  -j, --json             use JSON format of input and/or output
  -o, --output=output    specify output file
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  -y, --yaml             use YAML format of input and/or output
  --compact              use compact table format with no lines between body rows
  --expanded             use expanded table format with a line between each body row
  --indent=indent        specify indentation for formatting JSON or YAML output
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale
```

_See code: [src/commands/edge/drivers.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/drivers.ts)_

## `smartthings edge:drivers:delete [ID]`

delete an edge driver

```
USAGE
  $ smartthings edge:drivers:delete [ID]

ARGUMENTS
  ID  driver UUID

OPTIONS
  -h, --help             show CLI help
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale
```

_See code: [src/commands/edge/drivers/delete.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/drivers/delete.ts)_

## `smartthings edge:drivers:install [DRIVERID]`

install an edge driver onto a hub

```
USAGE
  $ smartthings edge:drivers:install [DRIVERID]

ARGUMENTS
  DRIVERID  id of driver to install

OPTIONS
  -C, --channel=channel  channel id
  -H, --hub=hub          hub id
  -h, --help             show CLI help
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale

EXAMPLES
  smartthings edge:drivers:install                                         # use Q&A format to enter required values
  smartthings edge:drivers:install -H <hub-id>                             # specify the hub on the command line, other 
  fields will be asked for
  smartthings edge:drivers:install -H <hub-id> -C <channel-id> <driver-id> # install a driver from a channel on an 
  enrolled hub
```

_See code: [src/commands/edge/drivers/install.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/drivers/install.ts)_

## `smartthings edge:drivers:installed [IDORINDEX]`

list all drivers installed on a given hub

```
USAGE
  $ smartthings edge:drivers:installed [IDORINDEX]

ARGUMENTS
  IDORINDEX  the driver id or number in list

OPTIONS
  -H, --hub=hub          hub id
  -h, --help             show CLI help
  -j, --json             use JSON format of input and/or output
  -o, --output=output    specify output file
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  -y, --yaml             use YAML format of input and/or output
  --compact              use compact table format with no lines between body rows
  --expanded             use expanded table format with a line between each body row
  --indent=indent        specify indentation for formatting JSON or YAML output
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale
```

_See code: [src/commands/edge/drivers/installed.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/drivers/installed.ts)_

## `smartthings edge:drivers:logcat [DRIVERID]`

stream logs from installed drivers

```
USAGE
  $ smartthings edge:drivers:logcat [DRIVERID]

ARGUMENTS
  DRIVERID  a specific driver to stream logs from

OPTIONS
  -a, --all                  stream from all installed drivers
  -h, --help                 show CLI help
  -p, --profile=profile      [default: default] configuration profile
  -t, --token=token          the auth token to use
  --hub-address=hub-address  IPv4 address of hub with optionally appended port number
  --language=language        ISO language code or "NONE" to not specify a language. Defaults to the OS locale
```

_See code: [src/commands/edge/drivers/logcat.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/drivers/logcat.ts)_

## `smartthings edge:drivers:package [PROJECTDIRECTORY]`

build and upload an edge package

```
USAGE
  $ smartthings edge:drivers:package [PROJECTDIRECTORY]

ARGUMENTS
  PROJECTDIRECTORY  [default: .] directory containing project to upload

OPTIONS
  -I, --install                prompt for hub to install to after assigning it to the channel, implies --assign if
                               --assign or --channel not included

  -a, --assign                 prompt for a channel to assign the driver to after upload

  -b, --build-only=build-only  save package to specified zip file but skip upload

  -h, --help                   show CLI help

  -j, --json                   use JSON format of input and/or output

  -o, --output=output          specify output file

  -p, --profile=profile        [default: default] configuration profile

  -t, --token=token            the auth token to use

  -u, --upload=upload          upload zip file previously built with --build flag

  -y, --yaml                   use YAML format of input and/or output

  --channel=channel            automatically assign driver to specified channel after upload

  --compact                    use compact table format with no lines between body rows

  --expanded                   use expanded table format with a line between each body row

  --hub=hub                    automatically install driver to specified hub, implies --assign if --assign or --channel
                               not included

  --indent=indent              specify indentation for formatting JSON or YAML output

  --language=language          ISO language code or "NONE" to not specify a language. Defaults to the OS locale

EXAMPLE
  # build and upload driver found in current directory:
  $ smartthings edge:drivers:package

  # build and upload driver found in current directory, assign it to a channel, and install it;
  # user will be prompted for channel and hub
  $ smartthings edge:drivers:package -I

  # build and upload driver found in current directory then assign it to the specified channel
  # and install it to the specified hub
  $ smartthings edge:drivers:package --channel <channel-id> --hub <hubId>

  # build and upload driver found in the my-driver directory
  $ smartthings edge:drivers:package my-driver

  # build the driver in the my-package directory and save it as driver.zip
  $ smartthings edge:drivers:package -b driver.zip my-package

  # upload the previously built driver found in driver.zip
  $ smartthings edge:drivers:package -u driver.zip
```

_See code: [src/commands/edge/drivers/package.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/drivers/package.ts)_

## `smartthings edge:drivers:uninstall [DRIVERID]`

uninstall an edge driver from a hub

```
USAGE
  $ smartthings edge:drivers:uninstall [DRIVERID]

ARGUMENTS
  DRIVERID  id of driver to uninstall

OPTIONS
  -H, --hub=hub          hub id
  -h, --help             show CLI help
  -p, --profile=profile  [default: default] configuration profile
  -t, --token=token      the auth token to use
  --language=language    ISO language code or "NONE" to not specify a language. Defaults to the OS locale
```

_See code: [src/commands/edge/drivers/uninstall.ts](https://github.com/SmartThingsCommunity/edge-cli-plugin/blob/v1.4.3/src/commands/edge/drivers/uninstall.ts)_
<!-- commandsstop -->

# Building

If you're a developer planning to work on the plugin, you can build and install
it this way.

## Prerequisites

* Node version 12 or later
* The latest release of the [SmartThings CLI](https://github.com/SmartThingsCommunity/smartthings-cli/blob/master/packages/cli/README.md)

## Building

1. npm install
1. npm run build

## Using Your Developer Build

Install the plugin by linking it:

    smartthings plugins:link ~path/to/this/repo
