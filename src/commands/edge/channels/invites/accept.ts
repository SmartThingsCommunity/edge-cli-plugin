import { EdgeCommand } from '../../../../lib/edge-command'


export default class ChannelsInvitesAcceptCommand extends EdgeCommand {
	static description = 'accept a channel invitation'

	static flags = EdgeCommand.flags

	static args = [{
		name: 'id',
		description: 'invite UUID',
		required: true,
	}]

	static aliases = ['edge:channels:invitations:accept']

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(ChannelsInvitesAcceptCommand)
		await super.setup(args, argv, flags)

		const id = args.id
		await this.edgeClient.invites.accept(id)
		this.log(`Invitation ${id} accepted.`)
	}
}
