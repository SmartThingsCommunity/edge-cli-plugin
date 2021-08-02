import { flags } from '@oclif/command'

import { Device, DeviceIntegrationType } from '@smartthings/core-sdk'
import { APICommand, ChooseOptions, chooseOptionsWithDefaults, selectFromList, stringTranslateToId } from '@smartthings/cli-lib'

import { EdgeCommand } from '../../../lib/edge-command'
import { EnrolledChannel } from '../../../lib/endpoints/hubs'


export async function chooseHub(command: APICommand, promptMessage: string, commandLineHubId?: string, options?: Partial<ChooseOptions>): Promise<string> {
	const opts = chooseOptionsWithDefaults(options)
	const config = {
		itemName: 'hub',
		primaryKeyName: 'deviceId',
		sortKeyName: 'name',
		listTableFieldDefinitions: ['label', 'name', 'deviceId'],
	}
	const listDrivers = (): Promise<Device[]> => command.client.devices.list({ capability: 'bridge', type: DeviceIntegrationType.HUB })
	const preselectedId = opts.allowIndex
		? await stringTranslateToId(config, commandLineHubId, listDrivers)
		: commandLineHubId
	return selectFromList(command, config, preselectedId, listDrivers, promptMessage)
}


export class DriversInstallCommand extends EdgeCommand {
	static description = 'install an edge driver onto a hub'

	static examples = [
		'smartthings edge:drivers:install                                         # use Q&A format to enter required values',
		'smartthings edge:drivers:install -H <hub-id>                             # specify the hub on the command line, other fields will be asked for',
		'smartthings edge:drivers:install -H <hub-id> -C <channel-id> <driver-id> # install a driver from a channel on an enrolled hub',
	]

	static flags = {
		...EdgeCommand.flags,
		hub: flags.string({
			char: 'H',
			description: 'hub id',
		}),
		channel: flags.string({
			char: 'C',
			description: 'channel id',
		}),
	}

	static args = [{
		name: 'driverId',
		description: 'id of driver to install',
	}]

	async chooseChannelFromEnrollments(hubId: string): Promise<string> {
		const config = {
			itemName: 'hub-enrolled channel',
			primaryKeyName: 'channelId',
			sortKeyName: 'name',
		}
		const listChannels = (): Promise<EnrolledChannel[]> => this.edgeClient.hubs.enrolledChannels(hubId)
		return selectFromList(this, config, undefined, listChannels, 'Select a channel to install the driver from.')
	}

	async chooseDriverFromChannel(channelId: string, preselectedDriverId?: string): Promise<string> {
		const config = {
			itemName: 'driver',
			primaryKeyName: 'driverId',
			sortKeyName: 'name',
		}
		interface DriverInfo {
			driverId: string
			name: string
		}
		const listDrivers = async (): Promise<DriverInfo[]> => {
			const drivers = await this.edgeClient.channels.listAssignedDrivers(channelId)
			return (await Promise.all(
				drivers.map(async driver => {
					try {
						const driverInfo = await this.edgeClient.drivers.getRevision(driver.driverId, driver.version)
						return {
							driverId: driver.driverId,
							name: driverInfo.name,
						}
					} catch (error) {
						// There is currently a bug in the API that causes `listAssignedDrivers`
						// to return drivers that were deleted but not removed from the channel.
						// We can tell they have been deleted because we get a 404 on the call
						// to `getRevision`, so we'll just skip them until the API is fixed.
						if (error.message.includes('status code 404')) {
							return undefined
						}
						throw error
					}
				}))).filter((driver): driver is DriverInfo => !!driver)
		}
		return selectFromList(this, config, preselectedDriverId, listDrivers, 'Select a driver to install.')
	}

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(DriversInstallCommand)
		await super.setup(args, argv, flags)

		const hubId = await chooseHub(this, 'Select a hub to install to.', flags.hub)
		const channelId = flags.channel ?? await this.chooseChannelFromEnrollments(hubId)
		const driverId = await this.chooseDriverFromChannel(channelId, args.driverId)
		await this.edgeClient.hubs.installDriver(driverId, hubId, channelId)
		this.log(`driver ${driverId} installed to hub ${hubId}`)
	}
}
