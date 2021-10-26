import { Device, DeviceIntegrationType } from '@smartthings/core-sdk'

import { APICommand, ChooseOptions, chooseOptionsWithDefaults, selectFromList,
	stringTranslateToId } from '@smartthings/cli-lib'

import { DriverChannelDetails } from '../endpoints/channels'
import { EdgeClient } from '../edge-client'
import { EdgeCommand } from '../edge-command'
import { EdgeDriverSummary } from '../endpoints/drivers'


export async function chooseDriver(command: EdgeCommand, promptMessage: string, commandLineDriverId?: string,
		options?: Partial<ChooseOptions>): Promise<string> {
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

export const chooseHub = async (command: APICommand, promptMessage: string,
		commandLineHubId: string | undefined, defaultHubId: string | undefined,
		options?: Partial<ChooseOptions>): Promise<string> => {
	const opts = chooseOptionsWithDefaults(options)
	const config = {
		itemName: 'hub',
		primaryKeyName: 'deviceId',
		sortKeyName: 'name',
		listTableFieldDefinitions: ['label', 'name', 'deviceId'],
	}
	const listDrivers = (): Promise<Device[]> => command.client.devices.list(
		{ capability: 'bridge', type: DeviceIntegrationType.HUB })

	const preselectedId = commandLineHubId
		? (opts.allowIndex
			? await stringTranslateToId(config, commandLineHubId, listDrivers)
			: commandLineHubId)
		: defaultHubId

	return selectFromList(command, config, preselectedId, listDrivers, promptMessage)
}

export interface DriverChannelDetailsWithName extends DriverChannelDetails {
	name: string
}

export const listAssignedDriversWithNames = async (client: EdgeClient, channelId: string): Promise<DriverChannelDetailsWithName[]> => {
	const drivers = await client.channels.listAssignedDrivers(channelId)
	return (await Promise.all(
		drivers.map(async driver => {
			try {
				const driverInfo = await client.channels.getDriverChannelMetaInfo(channelId, driver.driverId)
				return {
					...driver,
					name: driverInfo.name,
				}
			} catch (error) {
				// There is currently a bug in the API that causes `listAssignedDrivers`
				// to return drivers that were deleted but not removed from the channel.
				// We can tell they have been deleted because we get a 404 on the call
				// to `getRevision`, so we'll just skip them until the API is fixed.
				if (error.response?.status === 404) {
					return undefined
				}
				throw error
			}
		}))).filter((driver): driver is DriverChannelDetailsWithName => !!driver)
}

export const chooseDriverFromChannel = async (command: EdgeCommand, channelId: string,
		preselectedDriverId?: string): Promise<string> => {
	const config = {
		itemName: 'driver',
		primaryKeyName: 'driverId',
		sortKeyName: 'name',
	}
	const listDrivers = (): Promise<DriverChannelDetailsWithName[]> => listAssignedDriversWithNames(command.edgeClient, channelId)
	return selectFromList(command, config, preselectedDriverId, listDrivers, 'Select a driver to install.')
}
