import { Flags } from '@oclif/core'

import { EdgeCommand } from '../../../lib/edge-command'
import { selectFromList, stringTranslateToId } from '@smartthings/cli-lib'
import { chooseHub } from '../../../lib/commands/drivers-util'
import { InstalledDriver } from '../../../lib/endpoints/hubs'


export default class DriversUninstallCommand extends EdgeCommand<typeof DriversUninstallCommand.flags> {
	static description = 'uninstall an edge driver from a hub'

	static flags = {
		...EdgeCommand.flags,
		hub: Flags.string({
			char: 'H',
			description: 'hub id',
		}),
	}

	static args = [{
		name: 'driverId',
		description: 'id of driver to uninstall',
	}]

	private async chooseInstalledDriver(hubId: string, promptMessage: string,
			commandLineDriverId?: string): Promise<string> {
		const config = {
			itemName: 'driver',
			primaryKeyName: 'driverId',
			sortKeyName: 'name',
		}

		const listItems = (): Promise<InstalledDriver[]> => this.edgeClient.hubs.listInstalled(hubId)
		const preselectedId = await stringTranslateToId(config, commandLineDriverId, listItems)
		return selectFromList(this, config, { preselectedId, listItems, promptMessage })
	}

	async run(): Promise<void> {
		const hubId = await chooseHub(this, 'Select a hub to uninstall from.', this.flags.hub,
			{ useConfigDefault: true })
		const driverId = await this.chooseInstalledDriver(hubId, 'Select a driver to uninstall.',
			this.args.driverId)
		await this.edgeClient.hubs.uninstallDriver(driverId, hubId)
		this.log(`driver ${driverId} uninstalled from hub ${hubId}`)
	}
}
