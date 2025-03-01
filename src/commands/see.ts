import Command from '../struct/Command.js'
import Submission, { SubmissionInterface } from '../struct/Submission.js'
import Rejection, { RejectionInterface } from '../struct/Rejection.js'
import Discord, { TextChannel } from 'discord.js'
import { checkIfRejected } from '../utils/checkForSubmission.js'

export default new Command({
    name: 'see',
    description: 'SEE the review summary of a submission.',
    args: [
        {
            name: 'id',
            description: `message id of the submission`,
            required: true,
            optionType: 'string'
        }
    ],
    async run(i, client) {
        const options = i.options
        const guildData = client.guildsData.get(i.guild.id)
        const submitChannel = (await i.guild.channels.fetch(
            guildData.submitChannel
        )) as TextChannel
        const submissionId = options.getString('id')
        let submissionMsg
        let summary: string

        // make sure user knows how to use msg ids
        try {
            submissionMsg = await submitChannel.messages.fetch(submissionId)
        } catch (e) {
            return i.reply(
                `'${submissionId}' is not a valid message ID from the build submit channel!`
            )
        }

        // get submission from db
        const submissionData: SubmissionInterface = await Submission.findOne({
            _id: submissionId
        }).lean()

        // check if submission got rejet
        const isRejected = await checkIfRejected(submissionId)

        // return if submision is unreviewed (doesnt exist in rejections or submissions db)
        if (!submissionData && !isRejected) {
            return i.reply({
                embeds: [
                    new Discord.MessageEmbed().setDescription(
                        `this submission has not been reviewed yet!`
                    )
                ]
            })
        }

        // if its rejection, get rejction from db
        if (isRejected) {
            const rejectionData: RejectionInterface = await Rejection.findOne({
                _id: submissionId
            }).lean()

            summary = `that submission was rejected : (\n\nFeedback: \`${rejectionData.feedback}\``
        } else {
            // otherwise, its a reviewed submission
            // write the summary depending on which type of submission it was
            switch (submissionData.submissionType) {
                case 'ONE':
                    // if type ONE, change number size into a human readable size name
                    let sizeName
                    switch (submissionData.size) {
                        case 2:
                            sizeName = 'small'
                            break
                        case 5:
                            sizeName = 'medium'
                            break
                        case 10:
                            sizeName = 'large'
                            break
                        case 20:
                            sizeName = 'monumental'
                            break
                    }
                    // write the summary
                    summary = `This submission earned **${submissionData.pointsTotal} points!!!**\n\n*__Points breakdown:__*\nBuilding type: ${sizeName}\nQuality multiplier: x${submissionData.quality}\nComplexity multiplier: x${submissionData.complexity}\nBonuses: x${submissionData.bonus}\nCollaborators: ${submissionData.collaborators}\n[Link](${submissionMsg.url})\n\n__Feedback:__ \`${submissionData.feedback}\``
                    break
                case 'MANY':
                    summary = `This submission earned **${submissionData.pointsTotal} points!!!**\n\n*__Points breakdown:__*\nNumber of buildings (S/M/L): ${submissionData.smallAmt}/${submissionData.mediumAmt}/${submissionData.largeAmt}\nQuality multiplier: x${submissionData.quality}\nComplexity multiplier: x${submissionData.complexity}\nBonuses: x${submissionData.bonus}\n[Link](${submissionMsg.url})\n\n__Feedback:__ \`${submissionData.feedback}\``
                    break
                case 'LAND':
                    summary = `This submission earned **${submissionData.pointsTotal} points!!!**\n\n*__Points breakdown:__*\nLand area: ${submissionData.sqm} sqm\nQuality multiplier: x${submissionData.quality}\nComplexity multiplier: x${submissionData.complexity}\nBonuses: x${submissionData.bonus}\nCollaborators: ${submissionData.collaborators}\n[Link](${submissionMsg.url})\n\n__Feedback:__ \`${submissionData.feedback}\``
                    break
                case 'ROAD':
                    summary = `This submission earned **${submissionData.pointsTotal} points!!!**\n\n*__Points breakdown:__*\nRoad type: ${submissionData.roadType}\nQuality multiplier: x${submissionData.quality}\nComplexity multiplier: x${submissionData.complexity}\nDistance: ${submissionData.roadKMs} km\nBonuses: x${submissionData.bonus}\nCollaborators: ${submissionData.collaborators}\n[Link](${submissionMsg.url})\n\nFeedback: \`${submissionData.feedback}\``
                    break
            }
        }

        // send the review summary
        await i.reply({
            embeds: [new Discord.MessageEmbed().setTitle(`POINTS!`).setDescription(summary)]
        })
    }
})
