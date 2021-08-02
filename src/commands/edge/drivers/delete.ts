import { EdgeCommand } from '../../../lib/edge-command'
import { chooseDriver } from '../drivers'


export default class DriversDeleteCommand extends EdgeCommand {
	static description = 'delete an edge driver'

	static flags = EdgeCommand.flags

	static args = [{
		name: 'id',
		description: 'driver UUID',
	}]

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(DriversDeleteCommand)
		await super.setup(args, argv, flags)

		const id = await chooseDriver(this, 'Select a driver to delete.', args.id)
		await this.edgeClient.drivers.delete(id)
		this.log(`Driver ${id} deleted.`)
	}
}
