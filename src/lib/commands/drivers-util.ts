import { Device, DeviceIntegrationType, DriverChannelDetails, EdgeDriver, EdgeDriverSummary,
	SmartThingsClient } from '@smartthings/core-sdk'

import { APICommand, ChooseOptions, chooseOptionsWithDefaults, selectFromList,
	stringTranslateToId, summarizedText, TableGenerator } from '@smartthings/cli-lib'


export const listTableFieldDefinitions = ['driverId', 'name', 'version', 'packageKey']

export const permissionsValue = (driver: EdgeDriver): string => driver.permissions?.map(permission => permission.name).join('\n') || 'none'
export const buildTableOutput = (tableGenerator: TableGenerator, driver: EdgeDriver): string => {
	const basicInfo = tableGenerator.buildTableFromItem(driver, [
		'driverId', 'name', 'version', 'packageKey',
		{ label: 'Permissions', value: permissionsValue },
	])

	const deviceIntegrationProfiles = 'Device Integration Profiles\n' +
		tableGenerator.buildTableFromList(driver.deviceIntegrationProfiles,
			['id', 'majorVersion'])
	let fingerprints = 'No fingerprints specified.'
	if (driver.fingerprints?.length) {
		fingerprints = 'Fingerprints\n' +
			tableGenerator.buildTableFromList(driver.fingerprints, ['id', 'type', 'deviceLabel'])
	}
	return `Basic Information\n${basicInfo}\n\n` +
		`${deviceIntegrationProfiles}\n\n` +
		`${fingerprints}\n\n` +
		summarizedText
}

export async function chooseDriver(command: APICommand, promptMessage: string, commandLineDriverId?: string,
		options?: Partial<ChooseOptions>): Promise<string> {
	const opts = chooseOptionsWithDefaults(options)
	const config = {
		itemName: 'driver',
		primaryKeyName: 'driverId',
		sortKeyName: 'name',
	}
	const listDrivers = (): Promise<EdgeDriverSummary[]> => command.client.drivers.list()
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

export const listAssignedDriversWithNames = async (client: SmartThingsClient, channelId: string): Promise<DriverChannelDetailsWithName[]> => {
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

export const chooseDriverFromChannel = async (command: APICommand, channelId: string,
		preselectedDriverId?: string): Promise<string> => {
	const config = {
		itemName: 'driver',
		primaryKeyName: 'driverId',
		sortKeyName: 'name',
	}
	const listDrivers = (): Promise<DriverChannelDetailsWithName[]> => listAssignedDriversWithNames(command.client, channelId)
	return selectFromList(command, config, preselectedDriverId, listDrivers, 'Select a driver to install.')
}
