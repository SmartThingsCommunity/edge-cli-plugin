import { flags } from '@oclif/command'

import { ChooseOptions, chooseOptionsWithDefaults, outputListing, selectFromList,
	stringTranslateToId } from '@smartthings/cli-lib'

import { EdgeCommand } from '../../lib/edge-command'
import { Channel } from '../../lib/endpoints/channels'


interface ChooseChannelOptions extends ChooseOptions {
	includeReadOnly: boolean
}
const chooseChannelOptionsWithDefaults = (options?: Partial<ChooseChannelOptions>): ChooseChannelOptions => ({
	includeReadOnly: false,
	...chooseOptionsWithDefaults(options),
})
export async function chooseChannel(command: EdgeCommand, promptMessage: string,
		channelFromArg?: string, options?: Partial<ChooseChannelOptions>): Promise<string> {
	const opts = chooseChannelOptionsWithDefaults(options)
	const config = {
		itemName: 'channel',
		primaryKeyName: 'channelId',
		sortKeyName: 'name',
	}
	const listChannels = (): Promise<Channel[]> => command.edgeClient.channels.list({
		includeReadOnly: opts.includeReadOnly,
	})
	const preselectedId = opts.allowIndex
		? await stringTranslateToId(config, channelFromArg, listChannels)
		: channelFromArg
	return selectFromList(command, config, preselectedId, listChannels, promptMessage)
}

export const listTableFieldDefinitions = ['channelId', 'name', 'description', 'termsOfServiceUrl',
	'createdDate', 'lastModifiedDate']
export const tableFieldDefinitions = listTableFieldDefinitions


export default class ChannelsCommand extends EdgeCommand {
	static description = 'list all channels owned by you or retrieve a single channel'

	static flags = {
		...EdgeCommand.flags,
		...outputListing.flags,
		'include-read-only': flags.boolean({
			char: 'I',
			description: 'include subscribed-to channels as well as owned channels',
		}),
	}

	static args = [{
		name: 'idOrIndex',
		description: 'the channel id or number in list',
	}]

	static examples = [`# list all user-owned channels
$ smartthings edge:channels

# list user-owned and subscribed channels
$ smartthings edge:channels --include-read-only

# display details about the second channel listed when running "smartthings edge:channels"
$ smartthings edge:channels 2`]

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(ChannelsCommand)
		await super.setup(args, argv, flags)

		const config = {
			primaryKeyName: 'channelId',
			sortKeyName: 'name',
			listTableFieldDefinitions,
			tableFieldDefinitions,
		}

		await outputListing(this, config, args.idOrIndex,
			() => this.edgeClient.channels.list({ includeReadOnly: flags['include-read-only'] }),
			id => this.edgeClient.channels.get(id))
	}
}
