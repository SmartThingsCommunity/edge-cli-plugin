import { outputList } from '@smartthings/cli-lib'

import { chooseHub } from '../../../lib/commands/drivers-util'
import { EdgeCommand } from '../../../lib/edge-command'


export default class ChannelsEnrollmentsCommand extends EdgeCommand {
	static description = 'list all channels a given hub is enrolled in'

	static flags = {
		...EdgeCommand.flags,
		...outputList.flags,
	}

	static args = [{
		name: 'idOrIndex',
		description: 'the hub id or number in list',
	}]

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(ChannelsEnrollmentsCommand)
		await super.setup(args, argv, flags)

		const config = {
			primaryKeyName: 'channelId',
			sortKeyName: 'name',
			listTableFieldDefinitions: ['channelId', 'name', 'description', 'createdDate', 'lastModifiedDate', 'subscriptionUrl'],
		}

		const hubId = await chooseHub(this, 'Select a hub.', args.idOrIndex, this.defaultHubId,
			{ allowIndex: true })

		await outputList(this, config, () => this.edgeClient.hubs.enrolledChannels(hubId))
	}
}
