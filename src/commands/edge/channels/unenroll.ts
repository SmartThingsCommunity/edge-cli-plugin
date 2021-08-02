import { flags } from '@oclif/command'

import { chooseChannel } from '../channels'
import { chooseHub } from '../drivers/install'
import { EdgeCommand } from '../../../lib/edge-command'


export class ChannelsUnenrollCommand extends EdgeCommand {
	static description = 'unenroll a hub from a channel'

	static flags = {
		...EdgeCommand.flags,
		'channel': flags.string({
			char: 'C',
			description: 'channel id',
		}),
	}

	static args = [
		{
			name: 'hubId',
			description: 'hub id',
		},
	]

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(ChannelsUnenrollCommand)
		await super.setup(args, argv, flags)

		const channelId = await chooseChannel(this, 'Select a channel.', flags.channel)
		const hubId = await chooseHub(this, 'Select a hub.', args.hubId)

		await this.edgeClient.channels.unenrollHub(channelId, hubId)

		this.log(`${hubId} unenrolled from channel ${channelId}`)
	}
}
