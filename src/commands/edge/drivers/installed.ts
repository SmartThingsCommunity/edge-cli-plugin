import { Flags } from '@oclif/core'

import { InstalledDriver } from '@smartthings/core-sdk'

import { outputItemOrList, OutputItemOrListConfig } from '@smartthings/cli-lib'

import { chooseHub } from '../../../lib/commands/drivers-util'
import { EdgeCommand } from '../../../lib/edge-command'


export default class DriversInstalledCommand extends EdgeCommand<typeof DriversInstalledCommand.flags> {
	static description = 'list all drivers installed on a given hub'

	static flags = {
		...EdgeCommand.flags,
		...outputItemOrList.flags,
		hub: Flags.string({
			char: 'H',
			description: 'hub id',
		}),
		device: Flags.string({
			description: 'return drivers matching the specified device',
		}),
	}

	static args = [{
		name: 'idOrIndex',
		description: 'the driver id or number in list',
	}]

	async run(): Promise<void> {
		const config: OutputItemOrListConfig<InstalledDriver> = {
			primaryKeyName: 'channelId',
			sortKeyName: 'name',
			tableFieldDefinitions: ['driverId', 'name', 'description', 'version', 'channelId',
				'developer', 'vendorSummaryInformation'],
			listTableFieldDefinitions: ['driverId', 'name', 'description', 'version', 'channelId',
				'developer', 'vendorSummaryInformation'],
		}

		const hubId = await chooseHub(this, 'Select a hub.', this.flags.hub,
			{ allowIndex: true, useConfigDefault: true })

		await outputItemOrList(this, config, this.args.idOrIndex,
			() => this.client.hubdevices.listInstalled(hubId, this.flags.device),
			id => this.client.hubdevices.getInstalled(hubId, id))
	}
}
