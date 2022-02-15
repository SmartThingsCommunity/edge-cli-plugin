import { chooseChannel } from '../../../lib/commands/channels-util'
import { EdgeCommand } from '../../../lib/edge-command'


export default class ChannelsDeleteCommand extends EdgeCommand {
	static description = 'delete a channel'

	static flags = EdgeCommand.flags

	static args = [{
		name: 'id',
		description: 'channel id',
	}]

	async run(): Promise<void> {
		const { args, argv, flags } = await this.parse(ChannelsDeleteCommand)
		await super.setup(args, argv, flags)

		const id = await chooseChannel(this, 'Choose a channel to delete.', args.id)
		await this.client.channels.delete(id)
		this.log(`Channel ${id} deleted.`)
	}
}
