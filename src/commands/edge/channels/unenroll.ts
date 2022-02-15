import { Flags } from '@oclif/core'

import { chooseChannel } from '../../../lib/commands/channels-util'
import { chooseHub } from '../../../lib/commands/drivers-util'
import { EdgeCommand } from '../../../lib/edge-command'


export class ChannelsUnenrollCommand extends EdgeCommand {
	static description = 'unenroll a hub from a channel'

	static flags = {
		...EdgeCommand.flags,
		'channel': Flags.string({
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
		const { args, argv, flags } = await this.parse(ChannelsUnenrollCommand)
		await super.setup(args, argv, flags)

		const channelId = await chooseChannel(this, 'Select a channel.', flags.channel, undefined,
			{ includeReadOnly: true })
		const hubId = await chooseHub(this, 'Select a hub.', args.hubId, this.defaultHubId)

		await this.client.channels.unenrollHub(channelId, hubId)

		this.log(`${hubId} unenrolled from channel ${channelId}`)
	}
}
