import { flags } from '@oclif/command'

import { chooseDriver } from '../drivers'
import { chooseHub } from './install'
import { EdgeCommand } from '../../../lib/edge-command'


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

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(DriversUninstallCommand)
		await super.setup(args, argv, flags)

		const hubId = await chooseHub(this, 'Select a hub to uninstall from.', flags.hub)
		const driverId = await chooseDriver(this, 'Select a driver to uninstall.', args.driverId)
		await this.edgeClient.hubs.uninstallDriver(driverId, hubId)
		this.log(`driver ${driverId} uninstalled from hub ${hubId}`)
	}
}
