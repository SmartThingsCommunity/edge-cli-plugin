import { ChooseOptions, chooseOptionsWithDefaults, outputListing, selectFromList, stringTranslateToId } from '@smartthings/cli-lib'

import { EdgeCommand } from '../../lib/edge-command'
import { Channel } from '../../lib/endpoints/channels'


export async function chooseChannel(command: EdgeCommand, promptMessage: string, channelFromArg?: string, options?: Partial<ChooseOptions>): Promise<string> {
	const opts = chooseOptionsWithDefaults(options)
	const config = {
		itemName: 'channel',
		primaryKeyName: 'channelId',
		sortKeyName: 'name',
	}
	const listChannels = (): Promise<Channel[]> => command.edgeClient.channels.list()
	const preselectedId = opts.allowIndex
		? await stringTranslateToId(config, channelFromArg, listChannels)
		: channelFromArg
	return selectFromList(command, config, preselectedId, listChannels, promptMessage)
}

export const listTableFieldDefinitions = ['channelId', 'name', 'description', 'termsOfServiceUrl', 'createdDate', 'lastModifiedDate']
export const tableFieldDefinitions = listTableFieldDefinitions


export default class ChannelsCommand extends EdgeCommand {
	static description = 'list all channels owned by you or retrieve a single channel'

	static flags = {
		...EdgeCommand.flags,
		...outputListing.flags,
	}

	static args = [{
		name: 'idOrIndex',
		description: 'the channel id or number in list',
	}]

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
			() => this.edgeClient.channels.list(),
			id => this.edgeClient.channels.get(id))
	}
}
