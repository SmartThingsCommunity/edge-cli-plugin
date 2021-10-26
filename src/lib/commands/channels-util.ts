import { ChooseOptions, chooseOptionsWithDefaults, selectFromList, stringTranslateToId }
	from '@smartthings/cli-lib'

import { EdgeCommand } from '../../lib/edge-command'
import { Channel } from '../../lib/endpoints/channels'


export interface ChooseChannelOptions extends ChooseOptions {
	includeReadOnly: boolean
}
export const chooseChannelOptionsWithDefaults = (options?: Partial<ChooseChannelOptions>): ChooseChannelOptions => ({
	includeReadOnly: false,
	...chooseOptionsWithDefaults(options),
})

export async function chooseChannel(command: EdgeCommand, promptMessage: string,
		channelFromArg?: string, defaultChannelId?: string,
		options?: Partial<ChooseChannelOptions>): Promise<string> {
	const opts = chooseChannelOptionsWithDefaults(options)
	const config = {
		itemName: 'channel',
		primaryKeyName: 'channelId',
		sortKeyName: 'name',
	}
	const listChannels = (): Promise<Channel[]> => command.edgeClient.channels.list({
		includeReadOnly: opts.includeReadOnly,
	})

	const preselectedId = channelFromArg
		? (opts.allowIndex
			? await stringTranslateToId(config, channelFromArg, listChannels)
			: channelFromArg)
		: defaultChannelId

	return selectFromList(command, config, preselectedId, listChannels, promptMessage)
}
