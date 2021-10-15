import { outputListing } from '@smartthings/cli-lib'

import { EdgeCommand } from '../../lib/edge-command'


export default class DriversCommand extends EdgeCommand {
	static description = 'list all drivers available in a user account or retrieve a single driver'

	static flags = {
		...EdgeCommand.flags,
		...outputListing.flags,
	}

	static args = [{
		name: 'idOrIndex',
		description: 'the driver id or number in list',
	}]

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(DriversCommand)
		await super.setup(args, argv, flags)

		const config = {
			primaryKeyName: 'driverId',
			sortKeyName: 'name',
			tableFieldDefinitions: ['driverId', 'name', 'version', 'packageKey'],
			listTableFieldDefinitions: ['driverId', 'name', 'version', 'packageKey'],
		}

		await outputListing(this, config, args.idOrIndex,
			() => this.edgeClient.drivers.list(),
			id => this.edgeClient.drivers.get(id))
	}
}
