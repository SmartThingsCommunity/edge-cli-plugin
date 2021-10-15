import { outputList } from '@smartthings/cli-lib'
import { listAssignedDriversWithNames } from '../../../lib/commands/drivers-util'

import { EdgeCommand } from '../../../lib/edge-command'
import { chooseChannel } from '../channels'


export default class ChannelsDriversCommand extends EdgeCommand {
	static description = 'list all drivers assigned to a given channel'

	static flags = {
		...EdgeCommand.flags,
		...outputList.flags,
	}

	static args = [{
		name: 'idOrIndex',
		description: 'the channel id or number in list',
	}]

	static aliases = ['edge:channels:assignments']

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(ChannelsDriversCommand)
		await super.setup(args, argv, flags)

		const config = {
			primaryKeyName: 'channelId',
			sortKeyName: 'version',
			listTableFieldDefinitions: ['name', 'driverId', 'version', 'createdDate', 'lastModifiedDate'],
		}

		const channelId = await chooseChannel(this, 'Select a channel.', args.idOrIndex,
			{ allowIndex: true, includeReadOnly: true })

		await outputList(this, config, () => listAssignedDriversWithNames(this.edgeClient, channelId))
	}
}
