import { ChooseOptions, chooseOptionsWithDefaults, outputListing, selectFromList, stringTranslateToId } from '@smartthings/cli-lib'

import { EdgeCommand } from '../../lib/edge-command'
import { EdgeDriverSummary } from '../../lib/endpoints/drivers'


export async function chooseDriver(command: EdgeCommand, promptMessage: string, commandLineDriverId?: string, options?: Partial<ChooseOptions>): Promise<string> {
	const opts = chooseOptionsWithDefaults(options)
	const config = {
		itemName: 'driver',
		primaryKeyName: 'driverId',
		sortKeyName: 'name',
	}
	const listDrivers = (): Promise<EdgeDriverSummary[]> => command.edgeClient.drivers.list()
	const preselectedId = opts.allowIndex
		? await stringTranslateToId(config, commandLineDriverId, listDrivers)
		: commandLineDriverId
	return selectFromList(command, config, preselectedId, listDrivers, promptMessage)
}

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
