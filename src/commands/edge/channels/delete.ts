import { chooseChannel } from '../../../lib/commands/channels-util'
import { EdgeCommand } from '../../../lib/edge-command'


export default class ChannelsDeleteCommand extends EdgeCommand<typeof ChannelsDeleteCommand.flags> {
	static description = 'delete a channel'

	static flags = EdgeCommand.flags

	static args = [{
		name: 'id',
		description: 'channel id',
	}]

	async run(): Promise<void> {
		const id = await chooseChannel(this, 'Choose a channel to delete.', this.args.id)
		await this.client.channels.delete(id)
		this.log(`Channel ${id} deleted.`)
	}
}
