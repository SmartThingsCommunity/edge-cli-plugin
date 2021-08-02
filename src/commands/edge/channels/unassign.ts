import { flags } from '@oclif/command'

import { EdgeCommand } from '../../../lib/edge-command'
import { chooseChannel } from '../channels'
import { chooseDriver } from '../drivers'


export class ChannelsUnassignCommand extends EdgeCommand {
	static description = 'remove a driver from a channel'

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
	]

	static aliases = ['edge:drivers:unpublish']

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(ChannelsUnassignCommand)
		await super.setup(args, argv, flags)

		const channelId = await chooseChannel(this, 'Select a channel for the driver.', flags.channel)
		const driverId = await chooseDriver(this, 'Select a driver to remove from channel.', args.driverId)

		await this.edgeClient.channels.unassignDriver(channelId, driverId)

		this.log(`${driverId} removed from channel ${channelId}`)
	}
}
