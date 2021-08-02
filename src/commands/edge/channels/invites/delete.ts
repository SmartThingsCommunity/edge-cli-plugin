import { flags } from '@oclif/command'

import { EdgeCommand } from '../../../../lib/edge-command'
import { chooseInvite } from '../invites'


export default class ChannelsInvitesDeleteCommand extends EdgeCommand {
	static description = 'delete a channel invitation'

	static flags = {
		...EdgeCommand.flags,
		'channel': flags.string({
			char: 'C',
			description: 'channel id',
		}),
	}

	static args = [{
		name: 'id',
		description: 'invitation UUID',
	}]

	static aliases = [
		'edge:channels:invitations:revoke',
		'edge:channels:invitations:delete',
		'edge:channels:invites:revoke',
	]

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(ChannelsInvitesDeleteCommand)
		await super.setup(args, argv, flags)

		const id = await chooseInvite(this, 'Choose an invitation to delete.', flags.channel, args.id)
		await this.edgeClient.invites.delete(id)
		this.log(`Invitation ${id} deleted.`)
	}
}
