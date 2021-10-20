import {ChooseOptions, chooseOptionsWithDefaults, forAllOrganizations, selectFromList, stringTranslateToId}
	from '@smartthings/cli-lib'

import { EdgeCommand } from '../edge-command'
import { Channel } from '../endpoints/channels'


export interface ChooseChannelOptions extends ChooseOptions {
	includeReadOnly: boolean
}

export const chooseChannelOptionsWithDefaults = (options?: Partial<ChooseChannelOptions>): ChooseChannelOptions => ({
	includeReadOnly: false,
	...chooseOptionsWithDefaults(options),
})

export async function chooseChannel(command: EdgeCommand, promptMessage: string,
		channelFromArg?: string,
		defaultChannelId?: string,
		options?: Partial<ChooseChannelOptions>): Promise<string> {
	const opts = chooseChannelOptionsWithDefaults(options)
	const config = {
		itemName: 'channel',
		primaryKeyName: 'channelId',
		sortKeyName: 'name',
	}

	const channels = (): Promise<Channel[]> => listChannels(command, opts)

	const preselectedId = channelFromArg
		? (opts.allowIndex
			? await stringTranslateToId(config, channelFromArg, channels)
			: channelFromArg)
		: defaultChannelId

	return selectFromList(command, config, preselectedId, channels, promptMessage)
}

export async function listChannels(command: EdgeCommand, options?: Partial<ChooseChannelOptions>): Promise<Channel[]> {
	const allOrganizations = command.flags['all-organizations']
	const includeReadOnly = (options && options.includeReadOnly) || command.flags['include-read-only']
	if (allOrganizations) {
		const result = await forAllOrganizations(command.client, (org) => {
			const orgClient = command.edgeClient.cloneEdge({'X-ST-Organization': org.organizationId})
			return orgClient.channels.list()
		})
		if (includeReadOnly) {
			const possibleShared = await command.edgeClient.channels.list({ includeReadOnly })
			for (const channel of possibleShared) {
				if (!result.find(it => it.channelId === channel.channelId)) {
					result.push(channel)
				}
			}
		}
		return result
	}
	return command.edgeClient.channels.list({ includeReadOnly })
}
