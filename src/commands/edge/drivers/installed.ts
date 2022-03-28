import { Flags } from '@oclif/core'

import { outputListing } from '@smartthings/cli-lib'

import { chooseHub } from '../../../lib/commands/drivers-util'
import { EdgeCommand } from '../../../lib/edge-command'


export default class DriversInstalledCommand extends EdgeCommand {
	static description = 'list all drivers installed on a given hub'

	static flags = {
		...EdgeCommand.flags,
		...outputListing.flags,
		hub: Flags.string({
			char: 'H',
			description: 'hub id',
		}),
	}

	static args = [{
		name: 'idOrIndex',
		description: 'the driver id or number in list',
	}]

	async run(): Promise<void> {
		const { args, argv, flags } = await this.parse(DriversInstalledCommand)
		await super.setup(args, argv, flags)

		const config = {
			primaryKeyName: 'channelId',
			sortKeyName: 'name',
			tableFieldDefinitions: ['driverId', 'name', 'description', 'version', 'channelId',
				'developer', 'vendorSummaryInformation'],
			listTableFieldDefinitions: ['driverId', 'name', 'description', 'version', 'channelId',
				'developer', 'vendorSummaryInformation'],
		}

		const hubId = await chooseHub(this, 'Select a hub.', flags.hub,
			{ allowIndex: true, useConfigDefault: true })

		await outputListing(this, config, args.idOrIndex,
			() => this.edgeClient.hubs.listInstalled(hubId),
			id => this.edgeClient.hubs.getInstalled(hubId, id))
	}
}
