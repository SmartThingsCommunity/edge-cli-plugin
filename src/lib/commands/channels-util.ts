import { Channel, SubscriberType } from '@smartthings/core-sdk'

import { APICommand, ChooseOptions, chooseOptionsWithDefaults, forAllOrganizations, selectFromList,
	stringTranslateToId } from '@smartthings/cli-lib'


export const listTableFieldDefinitions = ['channelId', 'name', 'description', 'termsOfServiceUrl',
	'createdDate', 'lastModifiedDate']

export const tableFieldDefinitions = listTableFieldDefinitions

export interface ChooseChannelOptions extends ChooseOptions {
	includeReadOnly: boolean
}

export const chooseChannelOptionsWithDefaults = (options?: Partial<ChooseChannelOptions>): ChooseChannelOptions => ({
	includeReadOnly: false,
	...chooseOptionsWithDefaults(options),
})

export async function chooseChannel(command: APICommand, promptMessage: string,
		channelFromArg?: string,
		defaultChannelId?: string,
		options?: Partial<ChooseChannelOptions>): Promise<string> {
	const opts = chooseChannelOptionsWithDefaults(options)
	const config = {
		itemName: 'channel',
		primaryKeyName: 'channelId',
		sortKeyName: 'name',
	}

	const channels = (): Promise<Channel[]> => listChannels(command, undefined, undefined, opts)

	const preselectedId = channelFromArg
		? (opts.allowIndex
			? await stringTranslateToId(config, channelFromArg, channels)
			: channelFromArg)
		: defaultChannelId

	return selectFromList(command, config, preselectedId, channels, promptMessage)
}

export async function listChannels(command: APICommand, subscriberType?: SubscriberType, subscriberId?: string,
		options?: Partial<ChooseChannelOptions>): Promise<Channel[]> {
	const allOrganizations = command.flags['all-organizations']
	const includeReadOnly = (options && options.includeReadOnly) || command.flags['include-read-only']
	if (allOrganizations) {
		const result = await forAllOrganizations(command.client, orgClient => orgClient.channels.list())
		if (includeReadOnly) {
			const possibleShared = await command.client.channels.list({ includeReadOnly, subscriberType, subscriberId })
			for (const channel of possibleShared) {
				if (!result.find(it => it.channelId === channel.channelId)) {
					result.push(channel)
				}
			}
		}
		return result
	}
	return command.client.channels.list({ includeReadOnly, subscriberType, subscriberId })
}
