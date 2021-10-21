import { flags } from '@oclif/command'

import { chooseChannel } from '../../../lib/commands/channels-util'
import { chooseHub } from '../../../lib/commands/drivers-util'
import { EdgeCommand } from '../../../lib/edge-command'


export class ChannelsEnrollCommand extends EdgeCommand {
	static description = 'enroll a hub in a channel'

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
		const { args, argv, flags } = this.parse(ChannelsEnrollCommand)
		await super.setup(args, argv, flags)

		const channelId = await chooseChannel(this, 'Select a channel.', flags.channel,
			{ includeReadOnly: true })
		const hubId = await chooseHub(this, 'Select a hub.', args.hubId)

		await this.edgeClient.channels.enrollHub(channelId, hubId)

		this.log(`${hubId} enrolled in channel ${channelId}`)
	}
}
