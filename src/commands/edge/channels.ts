import { flags } from '@oclif/command'
import { outputListing, allOrganizationsFlags } from '@smartthings/cli-lib'
import { EdgeCommand } from '../../lib/edge-command'
import { listChannels} from '../../lib/commands/channels-util'


export const listTableFieldDefinitions = ['channelId', 'name', 'description', 'termsOfServiceUrl',
	'createdDate', 'lastModifiedDate']

export const tableFieldDefinitions = listTableFieldDefinitions

export default class ChannelsCommand extends EdgeCommand {
	static description = 'list all channels owned by you or retrieve a single channel'

	static flags = {
		...EdgeCommand.flags,
		...outputListing.flags,
		...allOrganizationsFlags,
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
			async () => {
				if (flags['all-organizations']) {
					config.listTableFieldDefinitions.push('organization')
				}
				return listChannels(this)
			},
			id => this.edgeClient.channels.get(id))
	}
}
