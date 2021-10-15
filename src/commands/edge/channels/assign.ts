import { flags } from '@oclif/command'

import { chooseDriver } from '../../../lib/commands/drivers-util'
import { EdgeCommand } from '../../../lib/edge-command'
import { chooseChannel } from '../channels'


export class ChannelsAssignCommand extends EdgeCommand {
	static description = 'assign a driver to a channel'

	static flags = {
		...EdgeCommand.flags,
		'channel': flags.string({
			char: 'C',
			description: 'channel id',
		}),
	}

	static args = [
		{
			name: 'driverId',
			description: 'driver id',
		},
		{
			name: 'version',
			description: 'driver version',
		},
	]

	static aliases = ['edge:drivers:publish']

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(ChannelsAssignCommand)
		await super.setup(args, argv, flags)

		const channelId = await chooseChannel(this, 'Select a channel for the driver.', flags.channel)
		const driverId = await chooseDriver(this, 'Select a driver to assign.', args.driverId)

		// If the version wasn't specified, grab it from the driver.
		const version = args.version ?? (await this.edgeClient.drivers.get(driverId)).version

		await this.edgeClient.channels.assignDriver(channelId, driverId, version)

		this.log(`${driverId} ${args.version ? `(version ${args.version})` : ''} assigned to channel ${channelId}`)
	}
}
