import { outputListing, forAllOrganizations, allOrganizationsFlags } from '@smartthings/cli-lib'

import { EdgeCommand } from '../../lib/edge-command'


export default class DriversCommand extends EdgeCommand {
	static description = `list all drivers owned by you or retrieve a single driver
Use this command to list all drivers you own, even if they are not yet assigned to a channel.

See also:
  edge:drivers:installed to list installed drivers
  edge:channels:drivers to list drivers that are part of a channel you own or have subscribed to
`

	static flags = {
		...EdgeCommand.flags,
		...outputListing.flags,
		...allOrganizationsFlags,
	}

	static args = [{
		name: 'idOrIndex',
		description: 'the driver id or number in list',
	}]

	static examples = [`# list all user-owned drivers
$ smartthings edge:drivers

# display details about the third driver listed in the above command
$ smartthings edge:drivers 3`,
	`
# display details about a driver by using its id
$ smartthings edge:drivers 699c7308-8c72-4363-9571-880d0f5cc725`]

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
			() => {
				if (flags['all-organizations']) {
					config.listTableFieldDefinitions.push('organization')
					return forAllOrganizations(this.client, (org) => {
						const orgClient = this.edgeClient.cloneEdge({ 'X-ST-Organization': org.organizationId })
						return orgClient.drivers.list()
					})
				}
				return this.edgeClient.drivers.list()
			},
			id => this.edgeClient.drivers.get(id))
	}
}
