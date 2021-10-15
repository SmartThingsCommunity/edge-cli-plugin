import { flags } from '@oclif/command'

import { EdgeCommand } from '../../../lib/edge-command'
import { selectFromList, stringTranslateToId } from '@smartthings/cli-lib'
import { chooseHub } from '../../../lib/commands/drivers-util'
import { InstalledDriver } from '../../../lib/endpoints/hubs'


export default class DriversUninstallCommand extends EdgeCommand {
	static description = 'uninstall an edge driver from a hub'

	static flags = {
		...EdgeCommand.flags,
		hub: flags.string({
			char: 'H',
			description: 'hub id',
		}),
	}

	static args = [{
		name: 'driverId',
		description: 'id of driver to uninstall',
	}]

	private async chooseInstalledDriver(hubId: string, promptMessage: string, commandLineDriverId?: string): Promise<string> {
		const config = {
			itemName: 'driver',
			primaryKeyName: 'driverId',
			sortKeyName: 'name',
		}

		const installedDrivers = (): Promise<InstalledDriver[]> => this.edgeClient.hubs.listInstalled(hubId)
		const preselectedId = await stringTranslateToId(config, commandLineDriverId, installedDrivers)
		return selectFromList(this, config, preselectedId, installedDrivers, promptMessage)
	}

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(DriversUninstallCommand)
		await super.setup(args, argv, flags)

		const hubId = await chooseHub(this, 'Select a hub to uninstall from.', flags.hub)
		const driverId = await this.chooseInstalledDriver(hubId, 'Select a driver to uninstall.', args.driverId)
		await this.edgeClient.hubs.uninstallDriver(driverId, hubId)
		this.log(`driver ${driverId} uninstalled from hub ${hubId}`)
	}
}
