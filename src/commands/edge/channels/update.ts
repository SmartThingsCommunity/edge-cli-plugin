import { inputAndOutputItem } from '@smartthings/cli-lib'

import { chooseChannel, tableFieldDefinitions } from '../channels'
import { EdgeCommand } from '../../../lib/edge-command'
import { Channel, ChannelUpdate } from '../../../lib/endpoints/channels'


export default class ChannelsUpdateCommand extends EdgeCommand {
	static description = 'update a channel'

	static flags = {
		...EdgeCommand.flags,
		...inputAndOutputItem.flags,
	}

	static args = [{
		name: 'id',
		description: 'the channel id',
	}]

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(ChannelsUpdateCommand)
		await super.setup(args, argv, flags)

		const id = await chooseChannel(this, 'Choose a channel to patch.', args.id)
		await inputAndOutputItem<ChannelUpdate, Channel>(this, { tableFieldDefinitions },
			(_, channelMods) => this.edgeClient.channels.update(id, channelMods))
	}
}
