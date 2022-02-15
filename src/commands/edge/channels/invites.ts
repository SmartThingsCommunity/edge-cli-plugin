import { Flags } from '@oclif/core'

import { ChooseOptions, chooseOptionsWithDefaults, outputListing, selectFromList, stringTranslateToId, TableFieldDefinition } from '@smartthings/cli-lib'

import { EdgeCommand } from '../../../lib/edge-command'
import { Invitation } from '../../../lib/endpoints/invites'


export const listTableFieldDefinitions: TableFieldDefinition<Invitation>[] = [
	'id',
	'metadata.name',
	{ label: 'Channel Id', prop: 'resource.components[0].id' },
	{
		label: 'Expiration',
		value: ({ expiration }) => expiration ? new Date(expiration * 1000).toISOString() : '',
	},
	'acceptUrl',
]
export const tableFieldDefinitions = [
	...listTableFieldDefinitions,
	'profileId',
]

const buildListFunction = (command: EdgeCommand, channelId?: string) => async (): Promise<Invitation[]> => {
	const channelIds = channelId
		? [channelId]
		: (await command.client.channels.list()).map(channel => channel.channelId)
	return (await Promise.all(channelIds.map(async channelId => await command.edgeClient.invites.list(channelId)))).flat()
}

export async function chooseInvite(command: EdgeCommand, promptMessage: string, channelId?: string, inviteFromArg?: string, options?: Partial<ChooseOptions>): Promise<string> {
	const opts = chooseOptionsWithDefaults(options)
	const config = {
		itemName: 'invitation',
		primaryKeyName: 'id',
		sortKeyName: 'id', // only supports simple properties so we can't sort by metadata.name even though we can use that in the table
		listTableFieldDefinitions: ['id', 'metadata.name'],
	}
	const listChannels = buildListFunction(command, channelId)
	const preselectedId = opts.allowIndex
		? await stringTranslateToId(config, inviteFromArg, listChannels)
		: inviteFromArg
	return selectFromList(command, config, preselectedId, listChannels, promptMessage)
}


export default class ChannelsInvitesCommand extends EdgeCommand {
	static description = 'list invitations or retrieve a single invitation by id or index'

	static flags = {
		...EdgeCommand.flags,
		...outputListing.flags,
		'channel': Flags.string({
			char: 'C',
			description: 'channel id',
		}),
	}

	static args = [{
		name: 'idOrIndex',
		description: 'the invitation id or number in list',
	}]

	static aliases = ['edge:channels:invitations']

	static examples = [
		'smartthings edge:channels:invites                  # list all invites on all channels you own',
		'smartthings edge:channels:invites 2                # list details about the second invite show when listed as in the example above',
		'smartthings edge:channels:invites -C <channel id>  # list all invites on channel with id <channel id>',
		'smartthings edge:channels:invites <invite id>      # list details about the invite with id <invite id>',
	]

	async run(): Promise<void> {
		const { args, argv, flags } = await this.parse(ChannelsInvitesCommand)
		await super.setup(args, argv, flags)

		const config = {
			primaryKeyName: 'id',
			sortKeyName: 'id',
			listTableFieldDefinitions,
			tableFieldDefinitions,
		}

		await outputListing<Invitation, Invitation>(this, config, args.idOrIndex,
			buildListFunction(this, flags.channel),
			id => this.edgeClient.invites.get(id))
	}
}
