import { flags } from '@oclif/command'

import { ChooseOptions, chooseOptionsWithDefaults, selectFromList, stringTranslateToId } from '@smartthings/cli-lib'

import { chooseChannel } from '../../../lib/commands/channels-util'
import { EdgeCommand } from '../../../lib/edge-command'
import { DriverChannelDetails } from '../../../lib/endpoints/channels'


export interface NamedDriverChannelDetails extends DriverChannelDetails {
	name: string
}

export async function chooseAssignedDriver(command: EdgeCommand, promptMessage: string,
		channelId: string, commandLineDriverId?: string, options?: Partial<ChooseOptions>): Promise<string> {
	const opts = chooseOptionsWithDefaults(options)
	const config = {
		itemName: 'driver',
		primaryKeyName: 'driverId',
		sortKeyName: 'name',
	}
	const listDrivers = async (): Promise<NamedDriverChannelDetails[]> => {
		const driverDetails = await command.edgeClient.channels.listAssignedDrivers(channelId)
		return (await Promise.all(driverDetails.map(async details => {
			try {
				const driver = await command.edgeClient.drivers.get(details.driverId)
				return { ...details, name: driver.name }
			} catch (error) {
				if (error.response?.status === 404) {
					return { ...details, name: '<deleted driver>' }
				}
				throw error
			}
		})))
	}
	const preselectedId = opts.allowIndex
		? await stringTranslateToId(config, commandLineDriverId, listDrivers)
		: commandLineDriverId
	return selectFromList(command, config, preselectedId, listDrivers, promptMessage)
}

export class ChannelsUnassignCommand extends EdgeCommand {
	static description = 'remove a driver from a channel'

	static flags = {
		...EdgeCommand.flags,
		'channel': flags.string({
			char: 'C',
			description: 'channel id',
		}),
	}

	static args = [
		{
			name: 'driverId',
			description: 'driver id',
		},
	]

	static aliases = ['edge:drivers:unpublish']

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(ChannelsUnassignCommand)
		await super.setup(args, argv, flags)

		const channelId = await chooseChannel(this, 'Select a channel for the driver.', flags.channel)
		const driverId = await chooseAssignedDriver(this, 'Select a driver to remove from channel.',
			channelId, args.driverId)

		await this.edgeClient.channels.unassignDriver(channelId, driverId)

		this.log(`${driverId} removed from channel ${channelId}`)
	}
}
